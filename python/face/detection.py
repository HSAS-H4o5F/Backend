from math import sqrt
import sys
import cv2
import numpy

haar_face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")  # type: ignore

while True:
    buffer_length = int(sys.stdin.buffer.readline().strip().decode())
    raw_buffer = sys.stdin.buffer.read(buffer_length)
    image_buffer = raw_buffer[:-1]
    image_format = raw_buffer[-1]
    size = int(sqrt(buffer_length - 1))

    if image_format == 2: # jpeg
        frame = cv2.imdecode(numpy.frombuffer(image_buffer, dtype=numpy.uint8), cv2.IMREAD_GRAYSCALE)
    else:
        frame = numpy.frombuffer(image_buffer, dtype=numpy.uint8).reshape(size, size, 1)

    if image_format == 1: # rgba8888
        frame = cv2.cvtColor(frame, cv2.COLOR_RGBA2GRAY)

    result = haar_face_cascade.detectMultiScale(frame, scaleFactor=1.2, minNeighbors=5)

    if len(result) == 0:
        sys.stdout.buffer.write(bytes([0]))
        sys.stdout.buffer.flush()
    elif len(result) == 1:
        x, y, w, h = result[0]

        if w * h < 0.5 * size * size:
            sys.stdout.buffer.write(bytes([2]))
            sys.stdout.buffer.flush()
        else:
            sys.stdout.buffer.write(bytes([x, y, w, h]))
            sys.stdout.buffer.flush()

            # cv2.rectangle(frame, (x, y), (x + w, y + h), (255, 0, 0), 2)
    else:
        sys.stdout.buffer.write(bytes([1]))
        sys.stdout.buffer.flush()

    # cv2.imshow('frame', frame)
    # cv2.waitKey(1)
