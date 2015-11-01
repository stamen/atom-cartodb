# Changes

## v0.7.3

* Remove use of `Promise.finally`, which appears to have disappeared in Atom
  1.1.0

## v0.7.2

* Attempt to create new templates for all 4xx responses

## v0.7.1

* Fix linting

## v0.7.0

* Include file path in general linting errors
* Improved messaging about errors and warnings
* Simplified named map YAML representation
* Introduced the notion of a "layer catalog" (for named maps to reference)

## v0.6.1

* Linter bug fix

## v0.6.0

* Prevent preview generation for non-project files
* Added CartoDB named map (JSON) exporting
* Fix retina support

## v0.5.1

* Removed NProgress

## v0.5.0

* Retina support
* Exposed preview + export functionality as menus (context and otherwise)
* Support for multiple preview panes

## v0.4.0

* Support for multiple styles (`<style.yml`; `project.yml` remains the default)

## v0.3.0

* Added TileMill exporting

## v0.2.5

* Display a warning notification when the preview pane can't be opened

## v0.2.4

* Handle non-CartoCSS errors in the linter
* Fail gracefully (and with a warning) when no `project.yml` could be found
* Display map instantiation errors in the preview pane

## v0.2.3

* Created named maps when necessary

## v0.2.2

* Duplicates v0.2.1 (`apm publish` was hanging)

## v0.2.1

* Only lint when configured
* Only split panes when necessary
* Make error control self-contained (and correctly positioned)

## v0.2.0

* Unintentional (same as v0.1.0)

## v0.1.0

* Initial release
