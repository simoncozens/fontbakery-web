import argparse
from fontbakery.commands.check_profile import get_module, log_levels
from fontbakery.reporters.serialize import SerializeReporter
from fontbakery.checkrunner import (
    get_module_profile,
    CheckRunner,
    START,
    ENDCHECK,
    distribute_generator,
)


class ProgressReporter(SerializeReporter):
    def __init__(self, callback, loglevels):
        super().__init__(loglevels)
        self.count = 0
        self.callback = callback

    def receive(self, event):
        super().receive(event)
        status, message, identity = event
        section, check, iterargs = identity
        key = self._get_key(identity)
        done = self.count - self._counter["(not finished)"]
        if status == START:
            self.count = len(message)
        elif status == ENDCHECK:
            self._items[key]["key"] = check.id
            self._items[key]["doc"] = check.__doc__
            self.callback({"progress": 100 * done / float(self.count)} | self._counter)
            if message >= self.loglevels:
                self.callback(self._items[key])


def run_fontbakery(
    paths,
    callback,
    profilename="universal",
    loglevels="INFO",
    checks=None,
    exclude_checks=None,
):
    loglevels = log_levels[loglevels]
    profile = get_module_profile(get_module("fontbakery.profiles." + profilename))
    argument_parser = argparse.ArgumentParser()
    # Hack
    argument_parser.add_argument(
            "--list-checks",
            default=False,
            action="store_true",
            help="List the checks available in the selected profile.",
        )
    values_keys = profile.setup_argparse(argument_parser)
    args = argument_parser.parse_args(paths)
    values = {}
    for key in values_keys:
        if hasattr(args, key):
            values[key] = getattr(args, key)
    runner = CheckRunner(
        profile,
        values=values,
        config={
            "custom_order": None,
            "explicit_checks": checks,
            "exclude_checks": exclude_checks,
        },
    )
    prog = ProgressReporter(callback, loglevels)
    prog.runner = runner
    reporters = [prog.receive]
    status_generator = runner.run()
    distribute_generator(status_generator, reporters)
