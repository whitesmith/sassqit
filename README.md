# SCAFFOLD
----
This scaffold depends on bower, so you better get it.

## Bower
Just `bower install` it!

#### Bower with Rails
If on a Rails application we need to tell asset pipeline where to get bower_components

1. Add `.bowerrc` and point the target

```JSON

{
  "directory": "vendor/assets/bower_components"
}
```

1. Tell asset pipeline where the components are, in `config/application.rb`

```Ruby

# tell asset pipeline where bower components are
config.assets.paths << Rails.root.join('vendor', 'assets', 'bower_components')
``

----
# Whitesmith ™