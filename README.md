# Grid Control

GNOME Shell extension to set the app grid's columns, rows, icon size and padding. Changes apply instantly — no relog or drag needed.

Supports GNOME Shell 50–51.

## Install

Download `grid-control@kelvinlby.github.io.shell-extension.zip` from the [latest release](../../releases/latest), then:

```bash
gnome-extensions install --force grid-control@kelvinlby.github.io.shell-extension.zip
```

Log out and back in (Wayland), then enable it:

```bash
gnome-extensions enable grid-control@kelvinlby.github.io
```

Configure via the Extensions app or `gnome-extensions prefs grid-control@kelvinlby.github.io`.

## Build from source

```bash
gnome-extensions pack --force --extra-source=LICENSE
```

## License

MIT
