
from flask import Blueprint, render_template_string

blueprint = Blueprint('main', __name__, static_folder='../static')


@blueprint.route('/')
def index():
    return render_template_string("<html><body>START</body></html>")
