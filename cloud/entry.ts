import {createFirebasePlatform} from './firebase-platform';
import config from './firebase.client.json';
import type {} from '../src/platform';
window.cultureRequest=createFirebasePlatform(config).request;
void import('../src/main');
