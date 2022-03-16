from json import JSONEncoder
import numpy as np


class NumpyArrayEncoder(JSONEncoder):
    """
    Ref: https://pynative.com/python-serialize-numpy-ndarray-into-json/
    """
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        else:
            return super(NumpyArrayEncoder, self).default(obj)
