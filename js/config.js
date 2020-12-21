const TIME_MAPPING = {
  "M": "6:00 ~ 6:50",
  "N": "7:00 ~ 7:50",
  "A": "8:00 ~ 8:50",
  "B": "9:00 ~ 9:50",
  "C": "10:10 ~ 11:00",
  "D": "11:10 ~ 12:00",
  "X": "12:20 ~ 13:10",
  "E": "13:20 ~ 14:10",
  "F": "14:20 ~ 15:10",
  "G": "15:30 ~ 16:20",
  "H": "16:30 ~ 17:20",
  "Y": "17:30 ~ 18:20",
  "I": "18:30 ~ 19:20",
  "J": "19:30 ~ 20:20",
  "K": "20:30 ~ 21:20",
  "L": "21:30 ~ 22:20"
};

const COURSE_TYPE = ['選修', '必修', '通識', '體育', '軍訓', '外語'];
const BERIEF_CODE = {
  'A501': '核心(人文)',
  'A502': '核心(社會)',
  'A503': '核心(自然)',
  'A504': '跨院',
  'A505': '校基本'
}
const YEAR = '109', SEMESTER = '2';
const APP_URL = `${location.protocol}//${location.host}${location.pathname}`;

const DEV = location.hostname === '127.0.0.1';

const OAUTH_CLIENT_ID = DEV ? "nVua1wBnhGZW9Y1UVVfNNkrreVCY31LvJnRoHGG4" : "3VH1pFMqlVR9RHlfyk83q2tqOnT3zaIL0k0ZyPcz";
const OAUTH_ORIGIN = DEV ? "http://127.0.0.1:5001" : "https://us-central1-nctuwu-9d0d4.cloudfunctions.net";

const firebaseConfig = {
  apiKey: "AIzaSyCf-vB0ZWg02Xua06yEbVBXYK0-KkuHNaw",
  authDomain: "nctuwu-9d0d4.firebaseapp.com",
  databaseURL: "https://nctuwu-9d0d4.firebaseio.com",
  projectId: "nctuwu-9d0d4",
  storageBucket: "nctuwu-9d0d4.appspot.com",
  messagingSenderId: "915718818939",
  appId: "1:915718818939:web:1a1d4e295e6685914ba6de",
  measurementId: "G-2RS0C00B4C"
};