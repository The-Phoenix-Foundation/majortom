
FROM python:3.6

# add application and dependencies
ADD phoenix /phoenix
WORKDIR /phoenix
RUN pip install -r requirements.txt

ENV FLASK_APP="phoenix.app:create_app()"

CMD gunicorn -w 4 wsgi:run
