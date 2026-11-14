export const INTERNAL_PROGRAM_ROUTES={culture:'/culture',classroom:'/widgets/english-classroom.html',diary:'/diary'};
export const DEFAULT_PROGRAMS=[
 {id:'culture',title:'세계문화 탐험',description:'명절로 만나는 넓은 세상, 영어로 건네는 첫 인사.',url:'/culture'},
 {id:'english-town',title:'My English Town',description:'우리들의 영어 마을에서 즐겁게 만나는 영어 학습.',url:'https://ina-seol.github.io/my-english-town/'},
 {id:'wisdom-maze',title:'지혜의 미로 탐험대',description:'미로 속 모험을 떠나, 생각하고 발견하는 탐험 놀이.',url:'https://ina-seol.github.io/wisdom-maze-prototype/'},
 {id:'nalmal',title:'낱말 놀이터',description:'16가지 미니게임으로 재미있게 복습하는 낱말.',url:'https://ina-seol.github.io/nalmal-playground/'},
 {id:'diary',title:'오늘의 일기장',description:'오늘의 기분과 작은 순간을 나만의 일기로 남겨요.',url:'/diary'},
 {id:'classroom',title:'나의 영어교실',description:'타이머, 랜덤 뽑기, 자리표와 알림장을 한 화면에.',url:'/widgets/english-classroom.html'}
];
export function isInternalProgram(id,url){return INTERNAL_PROGRAM_ROUTES[id]===url;}
