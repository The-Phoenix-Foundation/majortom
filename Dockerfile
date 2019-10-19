
FROM python:3.6

# add application and dependencies
ADD phoenix /phoenix
WORKDIR /phoenix
RUN pip install -r requirements.txt

ENV FLASK_APP="phoenix.app:create_app()"

#EXPOSE 8000
CMD gunicorn  --bind 0.0.0.0:8000 --log-file=- -w 4 wsgi:app
