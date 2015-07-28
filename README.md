# CartoDB Basemap Editor

This is an editor for editing maps on CartoDB. A compatible version of the
CartoDB basemaps can be found on
[GitHub at stamen/cartodb-basemaps](https://github.com/stamen/cartodb-basemaps).

To open the preview pane, open the _Command Palette_ (⇧⌘P) and enter some
variation on "Cartodb: Preview".

## Configuration

Before use, you'll need to provide your CartoDB username and add an API key.
Open the _Settings_ (`Atom` → `Preferences` → `Packages` → `cartodb` →
`Settings`) and fill in those fields.

## Extras

For the full experience, install these additional packages:

* [language-carto](https://atom.io/packages/language-carto) - for CartoCSS
  syntax highlighting
* [linter](https://atom.io/packages/linter) - displays syntax errors inline
* [pigments](https://atom.io/packages/pigments) inline display of color values
* [color-picker](https://atom.io/packages/color-picker) - color picker widget

## Additional Configuration

To get the full benefit from pigments, open its _Settings_ (`Atom` →
`Preferences` → `Packages` → `pigments` → `Settings`) and set its _Autocomplete
Scopes_ to:

```
'.source.css', '.source.css.less', '.source.sass', '.source.css.scss', '.source.stylus', '.source.css.mss'
```

and _Source Names_ to:

```
**/*.styl, **/*.stylus, **/*.less, **/*.sass, **/*.scss, **/*.mss
```

You may also want to experiment with _Marker Type_, as it makes working with
color variables more pleasant.
