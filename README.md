# Minimal Bundle

This is an example webpack config for a minimal bundle size.
It takes advantage of **es modules** with the `type="module"`
and `nomodule` attributes in script tags.

It showcases two strategies:
- A simple single build with split bundles
- A more advanced dual build with es5 bundles for legacy browsers and es6 bundles for modern browsers

## Polyfills

Polyfills are pieces of code that implement modern js
features that are not implemented in all browsers,
such as `Promise`, `fetch`, `Symbol`, etc.

The challange is to provide these polyfills only for
browsers, that do not support these features.

Modern browsers, that do implement all of those features,
should not need to download the code.
Usually polyfill scripts will only provide the alternative
implementation if the feature is not supported natively.
So modern browsers will download and parse big bundles of 
polyfill scripts, but never use any of the code.

A popular way of including polyfills in js bundles is to use
`@babel/polyfill`.
It is a big script that needs to be downloaded and parsed.
Most of it will never be used, though.

Its minified size is **86.6kB**, which takes around
**4.1sec** on a simulated slow 3G connection.
This can be improved by bundling a custom polyfill script,
which only includes features used in the project.
That is a certain overhead, but it can decrease the filesize
quite significantly.

For the sample app a set of commonly used polyfills is
included.
This custom bundle is **47.1kB** big and takes around
**3.4sec** on the same connection.

This technique improves loadtimes, but it adds the cost
of dealing with polyfills yourself and modern devices
still download an unneccessarily big bundle.
