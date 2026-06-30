import numpy as np
import pandas as pd
import torch
from torch.utils.data import Dataset, DataLoader
from transformers import BertTokenizer, BertForSequenceClassification
from torch.optim import AdamW
from transformers import get_scheduler
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import LabelEncoder
import json
import os
import re
import sys
import nltk
from nltk.stem import WordNetLemmatizer
from nltk.tokenize import word_tokenize

try:
    nltk.data.find('tokenizers/punkt')
    nltk.data.find('corpora/wordnet')
except nltk.downloader.DownloadError:
    exit()

lemmatizer = WordNetLemmatizer()

MODEL_NAME = 'bert-base-uncased'
MAX_LENGTH = 128
BATCH_SIZE = 16
NUM_EPOCHS = 10
OUTPUT_DIR = 'model'

class EmotionDataset(Dataset):
    def __init__(self, texts, labels, tokenizer, max_length=MAX_LENGTH):
        self.texts = texts
        self.labels = labels
        self.tokenizer = tokenizer
        self.max_length = max_length

    def __len__(self):
        return len(self.texts)

    def __getitem__(self, idx):
        text = str(self.texts[idx])
        label = self.labels[idx]

        encoding = self.tokenizer(
            text,
            add_special_tokens=True,
            max_length=self.max_length,
            padding='max_length',
            truncation=True,
            return_tensors='pt'
        )

        return {
            'input_ids': encoding['input_ids'].flatten(),
            'attention_mask': encoding['attention_mask'].flatten(),
            'label': torch.tensor(label, dtype=torch.long)
        }

def preprocess_text(text):
    if not isinstance(text, str):
        return ""
    text = text.lower()
    text = re.sub(r'[^a-z\s]', '', text)
    tokens = word_tokenize(text)
    lemmatized_tokens = [lemmatizer.lemmatize(word) for word in tokens]
    return ' '.join(lemmatized_tokens)

def augment_text(text):
    augmented = []
    words = text.split()

    if len(words) <= 3:
        return [text]

    augmented.append(text)

    if len(words) > 4:
        remove_idx = np.random.randint(0, len(words))
        aug_text = ' '.join(words[:remove_idx] + words[remove_idx+1:])
        augmented.append(aug_text)

    words_copy = words.copy()
    for i in range(len(words_copy)-1):
        if np.random.random() < 0.3:
            words_copy[i], words_copy[i+1] = words_copy[i+1], words_copy[i]

    aug_text = ' '.join(words_copy)
    augmented.append(aug_text)

    return augmented

def load_and_preprocess_data(file_path):
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        raise

    required_columns = {'text', 'emotion'}
    if not all(col in df.columns for col in required_columns):
        raise ValueError(f"Dataset must contain columns: {required_columns}")

    df = df.dropna(subset=['text', 'emotion'])
    df['text'] = df['text'].apply(preprocess_text)
    df = df[df['text'].str.len() > 0]

    augmented_texts = []
    augmented_emotions = []

    for text, emotion in zip(df['text'], df['emotion']):
        aug_texts = augment_text(text)
        augmented_texts.extend(aug_texts)
        augmented_emotions.extend([emotion] * len(aug_texts))

    return np.array(augmented_texts), np.array(augmented_emotions)

def train_epoch(model, data_loader, optimizer, scheduler, device):
    model.train()
    total_loss = 0
    correct_predictions = 0
    total_predictions = 0

    for batch in data_loader:
        input_ids = batch['input_ids'].to(device)
        attention_mask = batch['attention_mask'].to(device)
        labels = batch['label'].to(device)

        optimizer.zero_grad()

        outputs = model(
            input_ids=input_ids,
            attention_mask=attention_mask,
            labels=labels
        )

        loss = outputs.loss
        total_loss += loss.item()

        _, predicted = torch.max(outputs.logits, dim=1)
        correct_predictions += (predicted == labels).sum().item()
        total_predictions += labels.size(0)

        loss.backward()
        torch.nn.utils.clip_grad_norm_(model.parameters(), 1.0)

        optimizer.step()
        scheduler.step()

    avg_loss = total_loss / len(data_loader)
    accuracy = correct_predictions / total_predictions
    return avg_loss, accuracy

def evaluate(model, data_loader, device):
    model.eval()
    total_loss = 0
    correct_predictions = 0
    total_predictions = 0

    with torch.no_grad():
        for batch in data_loader:
            input_ids = batch['input_ids'].to(device)
            attention_mask = batch['attention_mask'].to(device)
            labels = batch['label'].to(device)

            outputs = model(
                input_ids=input_ids,
                attention_mask=attention_mask,
                labels=labels
            )

            loss = outputs.loss
            total_loss += loss.item()

            _, predicted = torch.max(outputs.logits, dim=1)
            correct_predictions += (predicted == labels).sum().item()
            total_predictions += labels.size(0)

    avg_loss = total_loss / len(data_loader)
    accuracy = correct_predictions / total_predictions
    return avg_loss, accuracy

def train_sentiment_model(dataset_path):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

    try:
        texts, labels = load_and_preprocess_data(dataset_path)

        label_encoder = LabelEncoder()
        encoded_labels = label_encoder.fit_transform(labels)
        num_labels = len(label_encoder.classes_)

        np.save(os.path.join(OUTPUT_DIR, 'label_encoder_classes.npy'), label_encoder.classes_)

        tokenizer = BertTokenizer.from_pretrained(MODEL_NAME)
        model = BertForSequenceClassification.from_pretrained(
            MODEL_NAME,
            num_labels=num_labels,
            problem_type="single_label_classification"
        )

        for param in model.bert.embeddings.parameters():
            param.requires_grad = False

        for i, layer in enumerate(model.bert.encoder.layer):
            if i < 10:
                for param in layer.parameters():
                    param.requires_grad = False

        model.to(device)

        train_texts, val_texts, train_labels, val_labels = train_test_split(
            texts,
            encoded_labels,
            test_size=0.2,
            random_state=42,
            stratify=encoded_labels
        )

        train_dataset = EmotionDataset(train_texts, train_labels, tokenizer)
        val_dataset = EmotionDataset(val_texts, val_labels, tokenizer)

        train_loader = DataLoader(train_dataset, batch_size=BATCH_SIZE, shuffle=True)
        val_loader = DataLoader(val_dataset, batch_size=BATCH_SIZE)

        warmup_steps = len(train_loader) * 2
        total_steps = len(train_loader) * NUM_EPOCHS

        optimizer_grouped_parameters = [
            {'params': [p for n, p in model.named_parameters() if 'classifier' in n], 'lr': 2e-4, 'weight_decay': 0.01},
            {'params': [p for n, p in model.named_parameters() if 'layer.11' in n], 'lr': 1e-4, 'weight_decay': 0.01},
            {'params': [p for n, p in model.named_parameters() if 'layer.10' in n], 'lr': 5e-5, 'weight_decay': 0.01},
        ]

        optimizer = AdamW(optimizer_grouped_parameters)
        scheduler = get_scheduler(
            name="linear",
            optimizer=optimizer,
            num_warmup_steps=warmup_steps,
            num_training_steps=total_steps
        )

        best_accuracy = 0

        for epoch in range(NUM_EPOCHS):
            train_loss, train_acc = train_epoch(model, train_loader, optimizer, scheduler, device)
            val_loss, val_acc = evaluate(model, val_loader, device)

            if val_acc > best_accuracy:
                best_accuracy = val_acc
                model.save_pretrained(os.path.join(OUTPUT_DIR, 'best_model'))
                tokenizer.save_pretrained(os.path.join(OUTPUT_DIR, 'best_model'))

        model_config = {
            'model_name': MODEL_NAME,
            'num_labels': num_labels,
            'max_length': MAX_LENGTH,
            'label_mapping': {i: label for i, label in enumerate(label_encoder.classes_)}
        }
        
        with open(os.path.join(OUTPUT_DIR, 'model_config.json'), 'w') as f:
            json.dump(model_config, f, indent=4)

    except Exception as e:
        raise

if __name__ == "__main__":
    if len(sys.argv) != 2:
        sys.exit(1)

    dataset_file_path = sys.argv[1]

    try:
        train_sentiment_model(dataset_file_path)
    except Exception as e:
        sys.exit(1)