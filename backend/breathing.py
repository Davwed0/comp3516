import numpy as np
import pandas as pd
from scipy import signal
import matplotlib.pyplot as plt
from ast import literal_eval
from collections import deque
from scipy.signal import (
    savgol_filter,
    detrend,
    correlate,
    find_peaks,
    sosfiltfilt,
    butter,
)
from hampel import hampel

"""
Computes the breathing rate for a given list of CSI data
Expects a 15 second window of CSI Data (therefore len(csi_data) == 1500)
The raw data of 234 readings should be converted to a list of 117 complex numbers
Returns int/float representing breathing rate in BPM
"""


def get_br(csi_data, fs=100):

    # -----------------------------------------------------------
    # PRE-PROCESS DATA
    # -----------------------------------------------------------

    csi_data = make_csi_complex(csi_data)

    # Get the average readings of subcarriers 20-50 (total = 1500x1 entries in list)
    s_t_complex = [np.mean(csi_row[20:30]) for csi_row in csi_data]

    # Perform np.diff to help normalize or sum shit?
    s_t_complex = np.diff(s_t_complex)

    # Detrend signal so that ACF is cool
    s_t = detrend(np.abs(s_t_complex))

    # -----------------------------------------------------------
    # FILTER AND SMOOTHEN SIGNAL
    # -----------------------------------------------------------
    s_filt = savgol_filter(s_t, 200, 4)
    s_filt = hampel(s_filt, window_size=10, n_sigma=3.0).filtered_data

    cutoff_freq = [0.15, 0.5]
    sos = butter(3, cutoff_freq, "band", fs=100, output="sos")
    s_filt = sosfiltfilt(sos, s_filt)

    # -----------------------------------------------------------
    # PERFORM ACF ON SIGNAL TO GET BREATHING RATE
    # -----------------------------------------------------------

    acf = correlate(s_filt, s_filt, mode="full")
    acf /= np.max(acf)
    acf = acf[acf.size // 2 :]

    # Get peaks in acf to determine bpm
    try:
        x, _ = find_peaks(acf, height=0.01, prominence=0.05)
        br = fs / x[0] * 60
        if (
            br < 8 or br > 25
        ):  # For unrealistic values, try next peak or default to reasonable guess
            if len(x) > 1:
                br = fs / x[1] * 60
            else:
                br = 15
            # print(f"Did not get realistic BPM - putting {br} BPM")
    except IndexError:
        print("Unable to detect peak - defaulting to 15 BPM")
        br = 15

    return br


"""
Converts the raw list of CSI data:  [ [50, 92, 5, 10, ...],     [15, 20, 19, 31,...],       ...]
into a list of complex values:      [ [92 + 50i, 10 + 5i, ...], [20 + 15i, 31 + 19i, ...],  ...]
"""


def make_csi_complex(csi_data):
    csi_processed = []

    for csi_row in csi_data:
        csi_processed.append(
            [complex(csi_row[i + 1], csi_row[i]) for i in range(0, len(csi_row), 2)]
        )

    return csi_processed
