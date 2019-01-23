import Promise from 'es6-promise';
import Set from 'es6-set';
import Map from 'es6-map';
import { fetch } from 'whatwg-fetch';
import 'raf/polyfill';
import 'es6-symbol/implement';
import 'iterators-polyfill';
import './ArrayFrom';
import './ObjectAssign';

if (!('Promise' in window)) {
  window.Promise = Promise;
}

if (!('Set' in window)) {
  window.Set = Set;
}

if (!('Map' in window)) {
  window.Map = Map;
}

if (!('fetch' in window)) {
  window.fetch = fetch;
}
