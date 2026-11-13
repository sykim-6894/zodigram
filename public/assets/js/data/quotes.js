// 한마디 목록을 화면에서 쓰기 좋은 객체로 바꿔 내보낸다. 원본은 quotes-east.js / quotes-west.js
import { EAST } from './quotes-east.js';
import { WEST } from './quotes-west.js';

const toObj = ([text, orig, src, tone]) => ({ text, orig, src, tone });

export const EAST_QUOTES = EAST.map(toObj);
export const WEST_QUOTES = WEST.map(toObj);
