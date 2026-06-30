import nltk

def download_nltk_data():
    required_packages = [
        'punkt',
        'wordnet',
        'averaged_perceptron_tagger',
        'omw-1.4'
    ]
    for package in required_packages:
        try:
            nltk.download(package)
        except Exception as e:
            pass

if __name__ == '__main__':
    download_nltk_data()