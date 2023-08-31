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
    def __init__(self, callback):
        super().__init__(log_levels["INFO"])
        self._tick = 0
        self.count = 0
        self.callback = callback

    def receive(self, event):
        super().receive(event)
        status, message, identity = event
        section, check, iterargs = identity
        key = self._get_key(identity)
        if status == START:
            self.count = len(message)
        elif status == ENDCHECK:
            self._tick += 1
            self._items[key]["key"] = check.id
            self._items[key]["doc"] = check.__doc__
            self.callback(self._items[key])
            self.callback({"progress": 100 * self._tick / float(self.count)})


def run_fontbakery(
    paths,
    callback=None,
    profilename="universal",
    loglevels="INFO",
    checks=None,
    exclude_checks=None,
):
    loglevels = log_levels[loglevels]
    profile = get_module_profile(get_module("fontbakery.profiles." + profilename))
    runner = CheckRunner(
        profile,
        values={"fonts": paths},
        config={
            "custom_order": None,
            "explicit_checks": checks,
            "exclude_checks": exclude_checks,
        },
    )
    prog = ProgressReporter(callback)
    prog.runner = runner
    reporters = [prog.receive]
    status_generator = runner.run()
    distribute_generator(status_generator, reporters)