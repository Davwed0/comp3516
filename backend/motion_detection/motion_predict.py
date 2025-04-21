
import pandas as pd
import numpy as np
import ast
from joblib import load

# def parse_csi(data_str):
#     # Convert string to list (e.g., "[17,-25,...]" -> [17, -25, ...])
#     csi_list = ast.literal_eval(data_str)
#     return np.array(csi_list)

def extract_amplitude_phase(csi_array):
    num_subcarriers = len(csi_array) // 2
    amplitudes = np.zeros(num_subcarriers)
    phases = np.zeros(num_subcarriers)
    
    for i in range(num_subcarriers):
        imag = csi_array[2 * i]      # Imaginary part
        real = csi_array[2 * i + 1]  # Real part
        amplitudes[i] = np.sqrt(imag**2 + real**2)
        phases[i] = np.arctan2(imag, real)
    
    return amplitudes, phases

def load_and_label(csi_data, label):
    data_list = []
    df = pd.DataFrame({'data': [item['CSIs'] for item in csi_data] if isinstance(csi_data, list) else [csi_data['CSIs']]})
    df['csi'] = df['data'].apply(lambda x: np.array(x))
    df['amplitudes'], df['phases'] = zip(*df['csi'].apply(extract_amplitude_phase))
    data_list.append(df['amplitudes'].values)
    data = np.concatenate(data_list, axis=0)
    return data

### FOR DETECTING MOTION ###


# params = load('model_params.joblib')

def extract_features(amplitudes, window_size, stride):
    n_windows = (amplitudes.shape[0] - window_size) // stride + 1
    features = np.zeros(n_windows)
    
    for i in range(n_windows):
        window = amplitudes[i*stride:i*stride + window_size]
        diffs = np.diff(window, axis=0)
        features[i] = np.mean(np.std(diffs, axis=0))

    return features

def predict_motion(new_data):
    WINDOW_SIZE = 50
    STRIDE = 50
    model = load('./motion_detection/motion_detection_model.joblib')
    # Extract features using saved parameters
    features = extract_features(new_data, WINDOW_SIZE, STRIDE)
    
    # Make prediction
    predictions = model.predict(features.reshape(-1, 1))
    return predictions