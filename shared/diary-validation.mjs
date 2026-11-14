export const MOODS=['happy','calm','excited','tired','sad'];
export function validateEntry(data){
 if(!data||typeof data!=='object')throw new Error('일기 내용을 확인해 주세요.');
 const {entryDate,title,content,mood}=data;
 const parsedDate=typeof entryDate==='string'?new Date(entryDate+'T00:00:00Z'):new Date(NaN);
 if(typeof entryDate!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(entryDate)||entryDate<'1900-01-01'||entryDate>'2199-12-31'||!Number.isFinite(parsedDate.getTime())||parsedDate.toISOString().slice(0,10)!==entryDate)throw new Error('올바른 날짜를 선택해 주세요.');
 if(typeof title!=='string'||!title.trim()||title.trim().length>120)throw new Error('제목은 1~120자로 적어 주세요.');
 if(typeof content!=='string'||!content.trim()||content.length>20000)throw new Error('일기는 1~20,000자로 적어 주세요.');
 if(!MOODS.includes(mood))throw new Error('오늘의 기분을 선택해 주세요.');
 return {entryDate,title:title.trim(),content:content.trim(),mood};
}
