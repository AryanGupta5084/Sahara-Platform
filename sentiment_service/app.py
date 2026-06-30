from flask import Flask, request, jsonify
from flask_cors import CORS
import torch
from transformers import BertTokenizer, BertForSequenceClassification
import numpy as np
import json
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

model = None
tokenizer = None
config = None
label_encoder_classes = None

device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')

def load_model_and_config():
    global model, tokenizer, config, label_encoder_classes
    try:
        with open('model/model_config.json', 'r') as f:
            config = json.load(f)
            
        model = BertForSequenceClassification.from_pretrained('model/best_model')
        tokenizer = BertTokenizer.from_pretrained('model/best_model')
        
        model.to(device)
        model.eval()
        
        label_encoder_classes = np.load('model/label_encoder_classes.npy', allow_pickle=True).tolist()
        
        return True
    except Exception as e:
        return False

def preprocess_text(text):
    return tokenizer(
        text,
        add_special_tokens=True,
        max_length=config['max_length'],
        padding='max_length',
        truncation=True,
        return_tensors='pt'
    )

@app.route('/healthz', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok'}), 200

@app.route('/analyze', methods=['POST'])
def analyze_sentiment():
    try:
        if model is None:
            return jsonify({'error': 'Model not loaded, please check server logs.'}), 500
            
        data = request.get_json()
        text = data.get('text', '')
        
        if not text:
            return jsonify({'error': 'No text provided'}), 400

        english_text = text
        
        encoding = preprocess_text(english_text)
        input_ids = encoding['input_ids'].to(device)
        attention_mask = encoding['attention_mask'].to(device)

        with torch.no_grad():
            outputs = model(input_ids=input_ids, attention_mask=attention_mask)
            predictions = torch.nn.functional.softmax(outputs.logits, dim=1)

        confidence, predicted_idx = torch.max(predictions, dim=1)
        predicted_emotion = label_encoder_classes[predicted_idx.item()]
        confidence = confidence.item()

        SUICIDAL_CONFIDENCE_THRESHOLD = float(os.getenv('SUICIDAL_CONFIDENCE_THRESHOLD', 0.75))
        needs_immediate_help = predicted_emotion == 'suicidal' and confidence > SUICIDAL_CONFIDENCE_THRESHOLD

        return jsonify({
            'emotion': predicted_emotion,
            'confidence': confidence,
            'needs_immediate_help': needs_immediate_help
        })

    except Exception as e:
        return jsonify({'error': "Internal server error analyzing sentiment."}), 500

if __name__ == '__main__':
    if load_model_and_config():
        port = int(os.getenv('SENTIMENT_SERVICE_PORT', 5001))
        app.run(host='0.0.0.0', port=port, debug=True)