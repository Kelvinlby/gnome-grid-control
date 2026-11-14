import Adw from 'gi://Adw';
import Gtk from 'gi://Gtk';
import Gio from 'gi://Gio';
import {ExtensionPreferences} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

export default class GridControlPrefs extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const page = new Adw.PreferencesPage();
        window.add(page);

        const spin = (group, key, title, subtitle = '') => {
            const range = settings.settings_schema.get_key(key).get_range()
                .deepUnpack()[1].deepUnpack();
            const row = Adw.SpinRow.new_with_range(range[0], range[1], 1);
            row.set({title, subtitle});
            settings.bind(key, row, 'value', Gio.SettingsBindFlags.DEFAULT);
            group.add(row);
        };

        const layout = new Adw.PreferencesGroup({title: 'Layout'});
        spin(layout, 'columns', 'Columns');
        spin(layout, 'rows', 'Rows');
        spin(layout, 'icon-size', 'Icon size', 'Pixels. 0 picks the largest size that fits');
        page.add(layout);

        const padding = new Adw.PreferencesGroup({
            title: 'Padding',
            description: 'Empty space around the grid on each page, in pixels',
        });
        spin(padding, 'padding-horizontal', 'Left and right');
        spin(padding, 'padding-vertical', 'Top and bottom');
        page.add(padding);

        const reset = new Gtk.Button({
            label: 'Reset to defaults',
            halign: Gtk.Align.CENTER,
            margin_top: 12,
            css_classes: ['pill'],
        });
        reset.connect('clicked', () => {
            for (const key of settings.settings_schema.list_keys())
                settings.reset(key);
        });
        const resetGroup = new Adw.PreferencesGroup();
        resetGroup.add(reset);
        page.add(resetGroup);
    }
}
