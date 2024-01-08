import asyncio
import sys
from math import sqrt

import cv2
import numpy
import tensorflow as tf
from deepface import DeepFace

tf.keras.utils.disable_interactive_logging()


async def process_frame(f: cv2.typing.MatLike):
    faces = DeepFace.extract_faces(f, detector_backend='yolov8', enforce_detection=False)

    if len(faces) == 0:
        sys.stdout.buffer.write(bytes([0]))
        sys.stdout.buffer.flush()
    elif len(faces) == 1:
        x, y, w, h = faces[0]['facial_area'].values()

        if w * h < 0.5 * size * size:
            sys.stdout.buffer.write(bytes([2]))
            sys.stdout.buffer.flush()
        else:
            sys.stdout.buffer.write(bytes([x, y, w, h]))
            sys.stdout.buffer.flush()
    else:
        sys.stdout.buffer.write(bytes([1]))
        sys.stdout.buffer.flush()


while True:
    buffer_length = int(sys.stdin.buffer.readline().strip().decode())
    raw_buffer = sys.stdin.buffer.read(buffer_length)
    image_buffer = raw_buffer[:-1]
    image_format = raw_buffer[-1]
    size = int(sqrt(buffer_length - 1))

    if image_format == 2:  # jpeg
        frame = cv2.imdecode(numpy.frombuffer(image_buffer, dtype=numpy.uint8), cv2.IMREAD_GRAYSCALE)
        frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2RGB)
    else:
        frame = numpy.frombuffer(image_buffer, dtype=numpy.uint8).reshape(size, size, 1)
        frame = cv2.cvtColor(frame, cv2.COLOR_GRAY2RGB)

    asyncio.run(process_frame(frame))
