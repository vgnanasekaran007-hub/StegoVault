# Gunicorn configuration for Render deployment
# Increase timeout for image processing operations

bind = "0.0.0.0:10000"
workers = 2
timeout = 120
