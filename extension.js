// Grid Control: fixed columns, rows, icon size and padding for the app grid.
//
// Why other extensions need "open, close, drag an icon" to take effect:
// IconGridLayout only reads fixed columns/rows in its constructor, and
// adaptToSize() bails out early while the page size is unchanged. Even when
// the new size is picked up, the saved page layout (app-picker-layout) still
// holds the old number of icons per page, so pages are left with gaps until
// a drag rewrites it. This extension sets the layout's internals directly,
// forces adaptToSize() to run, then reflows the saved layout to the new page
// size in its current order.

import GLib from 'gi://GLib';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';

export default class GridControlExtension extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._appDisplay = Main.overview._overview._controls._appDisplay;
        this._grid = this._appDisplay._grid;
        this._layout = this._grid.layout_manager;
        this._origStyle = this._grid.get_style();
        this._repackId = 0;

        this._settingsId = this._settings.connect('changed', () => this._apply());
        // AppGrid re-reads padding from CSS on style changes; re-adapt after it.
        this._styleId = this._grid.connect_after('style-changed', () => this._relayout());
        this._colsId = this._layout.connect('notify::columns-per-page', () => this._queueRepack());
        this._rowsId = this._layout.connect('notify::rows-per-page', () => this._queueRepack());

        this._apply();
        this._queueRepack();
    }

    disable() {
        this._settings.disconnect(this._settingsId);
        this._grid.disconnect(this._styleId);
        this._layout.disconnect(this._colsId);
        this._layout.disconnect(this._rowsId);
        if (this._repackId)
            GLib.source_remove(this._repackId);

        delete this._layout._fixedCols;
        delete this._layout._fixedRows;
        this._layout.fixed_icon_size = -1;
        this._grid.set_style(this._origStyle);
        this._relayout();
        this._repack();

        this._settings = this._appDisplay = this._grid = this._layout = null;
    }

    _apply() {
        const s = this._settings;
        const iconSize = s.get_int('icon-size');
        const h = s.get_int('padding-horizontal');
        const v = s.get_int('padding-vertical');

        this._layout._fixedCols = s.get_int('columns');
        this._layout._fixedRows = s.get_int('rows');
        this._layout.fixed_icon_size = iconSize > 0 ? iconSize : -1;
        this._grid.set_style(
            `page-padding-top: ${v}px; page-padding-bottom: ${v}px; ` +
            `page-padding-left: ${h}px; page-padding-right: ${h}px;`);
        this._relayout();
    }

    _relayout() {
        const layout = this._layout;
        const {_pageWidth: w, _pageHeight: h} = layout;
        if (w > 0 && h > 0) {
            // A pending icon-size update captured the old size and would
            // swallow this one; drop it so adaptToSize() schedules afresh.
            if (layout._updateIconSizesLaterId) {
                global.compositor.get_laters().remove(layout._updateIconSizesLaterId);
                layout._updateIconSizesLaterId = 0;
            }
            // Defeat the "same size, nothing to do" early return.
            layout._pageWidth = 0;
            layout.adaptToSize(w, h);
        }
        this._grid.queue_relayout();
    }

    _queueRepack() {
        if (this._repackId)
            return;
        this._repackId = GLib.idle_add(GLib.PRIORITY_DEFAULT_IDLE, () => {
            this._repackId = 0;
            this._repack();
            return GLib.SOURCE_REMOVE;
        });
    }

    // Reflow the saved layout into pages of the current size, keeping order.
    _repack() {
        const appDisplay = this._appDisplay;
        const grid = this._grid;
        const perPage = grid.itemsPerPage;
        if (appDisplay._placeholder || perPage <= 0 || perPage > 10000)
            return;

        const items = [];
        for (let i = 0; i < grid.nPages; i++)
            items.push(...grid.getItemsAtPage(i).filter(c => c.visible));

        const pages = [];
        items.forEach((item, i) => {
            const page = Math.floor(i / perPage);
            pages[page] ??= {};
            pages[page][item.id] = {position: i % perPage};
        });

        const saved = appDisplay._pageManager.pages;
        const same = saved.length === pages.length && pages.every((page, i) => {
            const ids = Object.keys(page);
            return ids.length === Object.keys(saved[i]).length &&
                ids.every(id => saved[i][id]?.position === page[id].position);
        });
        if (same)
            return;

        appDisplay._pageManager.pages = pages.map(page => Object.fromEntries(
            Object.entries(page).map(([id, {position}]) =>
                [id, {position: GLib.Variant.new_int32(position)}])));
        appDisplay._redisplay();
    }
}
