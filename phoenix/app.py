
from flask import Flask, g, render_template, url_for, request, make_response


def create_app():
    app = Flask(__name__)

    from main.views import blueprint as main_blueprint
    app.register_blueprint(main_blueprint)

    return app


if __name__ == '__main__':
    app = create_app()
    app.run()
