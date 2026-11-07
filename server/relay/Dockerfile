# Feedback relay. python:alpine plus apk upgrade, same as the other images on this server:
# a fix in an Alpine library lands at the next build instead of waiting for a new base image.
FROM python:3.13-alpine
RUN apk upgrade --no-cache
WORKDIR /app
COPY requirements.txt requirements-dev.txt ./
RUN pip install --no-cache-dir -r requirements-dev.txt
COPY app.py report.py test_app.py ./
# The image does not build if the relay's own tests fail.
RUN python -m pytest -q test_app.py && pip uninstall -y pytest
RUN adduser -D -H -u 10001 relay && mkdir -p /data && chown relay /data
USER relay
ENV RELAY_DB=/data/relay.sqlite3
EXPOSE 8000
CMD ["gunicorn", "--workers", "1", "--threads", "4", "--bind", "0.0.0.0:8000", "--access-logfile", "-", "app:app"]
