import os
os.environ["CUDA_VISIBLE_DEVICES"] = "-1"

import cv2
import numpy as np
import pandas as pd
import json
import glob
from sklearn.model_selection import train_test_split
import tensorflow as tf
from tensorflow.keras.models import Model, Sequential
from tensorflow.keras.layers import Input, Conv2D, MaxPooling2D, UpSampling2D, Dense, Flatten, Dropout
from tensorflow.keras.callbacks import EarlyStopping

# --- Configuration ---
# ▼▼▼ UPDATED PATHS TO POINT TO YOUR CLEANED DATA ▼▼▼
PATH_CLASSIFICATION_DATASET = r"D:/Major Prj 2/AI-Bone-Cancer-Detection/classification_data" # e.g., "D:/Major Prj 2/AI-Bone-Cancer-Detection/training_dataset"
PATH_GATEKEEPER_DATASET = r"D:/Major Prj 2/AI-Bone-Cancer-Detection/training_dataset/gatekeeper" # The new folder you just created
PATH_BTXRD_DATASET = r"D:/Major Prj 2/AI-Bone-Cancer-Detection/BTXRD" # Still needed for segmentation

MODELS_SAVE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "models")
os.makedirs(MODELS_SAVE_PATH, exist_ok=True)
IMAGE_SIZE_CLASSIFICATION = (224, 224)
IMAGE_SIZE_SEGMENTATION = (256, 256)

# --- Utility Functions ---
def create_mask_from_annotation(annotation_path, height, width):
    mask = np.zeros((height, width), dtype=np.uint8)
    if not os.path.exists(annotation_path): return mask
    try:
        with open(annotation_path, 'r') as f: data = json.load(f)
        img_h, img_w = data.get('imageHeight', height), data.get('imageWidth', width)
        for shape in data.get('shapes', []):
            polygon = np.array(shape['points'], dtype=np.float32)
            polygon[:, 0] *= (width / img_w); polygon[:, 1] *= (height / img_h)
            pts = np.array([polygon], dtype=np.int32)
            cv2.fillPoly(mask, pts, 255)
    except Exception as e:
        print(f"Warning: Could not process annotation file {annotation_path}. Error: {e}")
    return mask

# --- ▼▼▼ NEW DEDICATED FUNCTION FOR SEGMENTATION DATA ▼▼▼ ---
def load_segmentation_data():
    segmentation_data = []
    print(f"\n--- Loading Segmentation Data from BTXRD: {PATH_BTXRD_DATASET} ---")
    excel_path = os.path.join(PATH_BTXRD_DATASET, "dataset.xlsx")
    if not os.path.exists(excel_path):
        print(f"   ⚠️ Warning: Could not find 'dataset.xlsx'. Cannot load segmentation data.")
        return np.array([]), np.array([])

    try:
        df = pd.read_excel(excel_path)
        for _, row in df.iterrows():
            if row['malignant'] == 1:
                img_name = str(row['image_id'])
                if '.' not in img_name:
                    found_files = glob.glob(os.path.join(PATH_BTXRD_DATASET, "images", f"{img_name}.*"))
                    if not found_files: continue
                    img_name = os.path.basename(found_files[0])
                
                img_path = os.path.join(PATH_BTXRD_DATASET, "images", img_name)
                ann_path = os.path.join(PATH_BTXRD_DATASET, "Annotations", img_name.rsplit('.', 1)[0] + '.json')
                if os.path.exists(img_path) and os.path.exists(ann_path):
                    segmentation_data.append((img_path, ann_path))
    except Exception as e:
        print(f"   ❌ Error processing BTXRD metadata for segmentation: {e}")

    all_seg_images, all_seg_masks = [], []
    for img_path, ann_path in segmentation_data:
        img = cv2.imread(img_path)
        if img is not None:
            img_resized = cv2.cvtColor(cv2.resize(img, IMAGE_SIZE_SEGMENTATION), cv2.COLOR_BGR2RGB)
            mask = create_mask_from_annotation(ann_path, IMAGE_SIZE_SEGMENTATION[0], IMAGE_SIZE_SEGMENTATION[1])
            all_seg_images.append(img_resized)
            all_seg_masks.append(mask)

    print(f"✅ Total Segmentation Images Prepared: {len(all_seg_images)}")
    return (np.array(all_seg_images, dtype=np.float32) / 255.0,
            np.expand_dims(np.array(all_seg_masks, dtype=np.float32) / 255.0, -1))

# --- Model Architectures (unchanged) ---
def build_classification_model(input_shape=IMAGE_SIZE_CLASSIFICATION + (3,)):
    model = Sequential([
        Input(shape=input_shape),
        # A simple rescaling layer
        tf.keras.layers.Rescaling(1./255),
        Conv2D(32, (3, 3), activation='relu', padding='same'),
        MaxPooling2D((2, 2)),
        Conv2D(64, (3, 3), activation='relu', padding='same'),
        MaxPooling2D((2, 2)),
        Flatten(),
        Dense(128, activation='relu'),
        Dropout(0.5),
        Dense(1, activation='sigmoid') # Use 1 neuron for binary classification
    ])
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    return model

def build_segmentation_model(input_shape=IMAGE_SIZE_SEGMENTATION + (3,)):
    inputs = Input(input_shape)
    c1 = Conv2D(16, (3, 3), activation='relu', padding='same')(inputs)
    p1 = MaxPooling2D((2, 2))(c1)
    c2 = Conv2D(32, (3, 3), activation='relu', padding='same')(p1)
    p2 = MaxPooling2D((2, 2))(c2)
    u1 = UpSampling2D((2, 2))(p2)
    u1 = Conv2D(32, (3, 3), activation='relu', padding='same')(u1)
    u2 = UpSampling2D((2, 2))(u1)
    u2 = Conv2D(16, (3, 3), activation='relu', padding='same')(u2)
    outputs = Conv2D(1, (1, 1), activation='sigmoid')(u2)
    model = Model(inputs, outputs)
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    return model

def build_gatekeeper_model(input_shape=IMAGE_SIZE_CLASSIFICATION + (3,)):
    model = Sequential([
        Input(shape=input_shape),
        tf.keras.layers.Rescaling(1./255),
        Conv2D(32, (3, 3), activation='relu'),
        MaxPooling2D(2, 2),
        Conv2D(64, (3, 3), activation='relu'),
        MaxPooling2D(2, 2),
        Conv2D(128, (3, 3), activation='relu'),
        MaxPooling2D(2, 2),
        Flatten(),
        Dense(128, activation='relu'),
        Dropout(0.5),
        Dense(1, activation='sigmoid')
    ])
    model.compile(optimizer='adam', loss='binary_crossentropy', metrics=['accuracy'])
    return model

# --- ▼▼▼ NEW SIMPLIFIED TRAINING FUNCTIONS ▼▼▼ ---
def train_classification_model(batch_size=32, epochs=25):
    print("\n--- 🧠 Starting Classification Model Training (Benign/Malignant) ---")
    
    # Load data directly from the sorted directories
    train_ds = tf.keras.utils.image_dataset_from_directory(
        PATH_CLASSIFICATION_DATASET,
        validation_split=0.2,
        subset="training",
        seed=123,
        image_size=IMAGE_SIZE_CLASSIFICATION,
        batch_size=batch_size,
        label_mode='binary' # For benign/malignant
    )

    val_ds = tf.keras.utils.image_dataset_from_directory(
        PATH_CLASSIFICATION_DATASET,
        validation_split=0.2,
        subset="validation",
        seed=123,
        image_size=IMAGE_SIZE_CLASSIFICATION,
        batch_size=batch_size,
        label_mode='binary'
    )
    
    print(f"Found classes: {train_ds.class_names}")

    AUTOTUNE = tf.data.AUTOTUNE
    train_ds = train_ds.cache().shuffle(1000).prefetch(buffer_size=AUTOTUNE)
    val_ds = val_ds.cache().prefetch(buffer_size=AUTOTUNE)

    model = build_classification_model()
    model.summary()
    early_stopper = EarlyStopping(monitor='val_loss', patience=5, verbose=1, restore_best_weights=True)
    
    model.fit(train_ds, validation_data=val_ds, epochs=epochs, callbacks=[early_stopper])
    
    model_path = os.path.join(MODELS_SAVE_PATH, "classification_model.h5")
    model.save(model_path)
    print(f"✅ Classification model saved to {model_path}")

def train_segmentation_model(batch_size=4, epochs=20):
    print("\n--- 🎨 Starting Segmentation Model Training ---")
    seg_images, seg_masks = load_segmentation_data()
    if seg_images.size == 0:
        print("\n❌ No segmentation data was loaded. Cannot train.")
        return
        
    X_train, X_val, y_train, y_val = train_test_split(seg_images, seg_masks, test_size=0.2, random_state=42)
    
    model = build_segmentation_model()
    model.summary()
    early_stopper = EarlyStopping(monitor='val_loss', patience=5, verbose=1, restore_best_weights=True)
    
    model.fit(X_train, y_train, validation_data=(X_val, y_val), epochs=epochs, batch_size=batch_size, callbacks=[early_stopper])
    
    model_path = os.path.join(MODELS_SAVE_PATH, "segmentation_model.h5")
    model.save(model_path)
    print(f"✅ Segmentation model saved to {model_path}")

def train_gatekeeper_model(batch_size=16, epochs=15):
    print("\n--- 🚪 Starting Gatekeeper Model Training (Bone/Not-Bone) ---")

    train_ds = tf.keras.utils.image_dataset_from_directory(
        PATH_GATEKEEPER_DATASET,
        validation_split=0.2,
        subset="training",
        seed=123,
        image_size=IMAGE_SIZE_CLASSIFICATION,
        batch_size=batch_size,
        label_mode='binary'
    )

    val_ds = tf.keras.utils.image_dataset_from_directory(
        PATH_GATEKEEPER_DATASET,
        validation_split=0.2,
        subset="validation",
        seed=123,
        image_size=IMAGE_SIZE_CLASSIFICATION,
        batch_size=batch_size,
        label_mode='binary'
    )

    print(f"Found classes: {train_ds.class_names}")

    AUTOTUNE = tf.data.AUTOTUNE
    train_ds = train_ds.cache().shuffle(1000).prefetch(buffer_size=AUTOTUNE)
    val_ds = val_ds.cache().prefetch(buffer_size=AUTOTUNE)

    model = build_gatekeeper_model()
    model.summary()
    early_stopper = EarlyStopping(monitor='val_loss', patience=3, verbose=1, restore_best_weights=True)
    
    model.fit(train_ds, validation_data=val_ds, epochs=epochs, callbacks=[early_stopper])
    
    model_path = os.path.join(MODELS_SAVE_PATH, "gatekeeper_model.h5")
    model.save(model_path)
    print(f"✅ Gatekeeper model saved to {model_path}")

# --- Main Execution ---
def main():
    print("\n--- Bone Cancer AI Model Training Suite ---")
    print("1. Train Classification Model (Benign vs. Malignant)")
    print("2. Train Segmentation Model")
    print("3. Train Gatekeeper Model (Bone vs. Not-Bone)")
    print("---------------------------------------------")
    choice = input("Enter your choice (e.g., 1): ").strip()
    
    if choice == "1":
        train_classification_model()
    elif choice == "2":
        train_segmentation_model()
    elif choice == "3":
        train_gatekeeper_model()
    else:
        print("Invalid choice. Exiting.")

if __name__ == "__main__":
    main()