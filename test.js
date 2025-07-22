import { workerData } from "worker_threads";

let searchLines = [
    '  let person = {',
    "    name: 'kanade',",
    '    age: 18,',
    '    subject: {',
    "      math: 'good',",
    "      english: 'bad',",
    '    },',
    '  };'
]

for (let k = 0; k < searchLines.length; k++) {
    let line = searchLines[k].trim();

    // object名と要素名を入れた配列
    let nowObject = [];
    // count="{" - "}"の個数
    let count = null;
    while (count !== 0) {
        if (count === null) count = 0;
        let phrases = line.split(' ');
        for (let l = 0; l < phrases.length; l++) {
            let word = phrases[l];
            console.log("word:", word)
            if (l + 2 < phrases.length) {
                // objectの開始位置の処理
                if (phrases[l + 1] === "=" && phrases[l + 2] === "{") {
                    // variable = {
                    count++;
                    // 最初は既に配列がある為配列を追加しない
                    // 最初のobject名を追加
                    nowObject.push(word)
                }
            }
            if (l + 1 < phrases.length) {
                if (word !== "=" && phrases[l + 1] === "{") {
                    // variable: {
                    count++;
                    nowObject.push([]);
                }
            }
            if (word.includes(':')) {
                // 今の配列に対応した位置inNowObjectへ今の変数名を追加
                console.log(36, nowObject, count)
                let newWord = word.split(":")[0];
                colon(nowObject, count-1).push(newWord);
            }
            if (word.includes('}')) {
                count--;
            }
            console.log("count:", count)
            console.log("nowObject:", nowObject)
        }
        if (count !== 0) {
            k++;
            if (!(k < searchLines.length)) break;
            // 長さが0=空の行だったら行が出るまで足し続ける
            while (searchLines[k].length === 0) k++;
            line = searchLines[k].trim();
        }
    }
}

/*
function colon(nowObject) {
    // 配列が複数存在しないなら今の場所を返す
    if (!nowObject.at(-1).at(-1)) return nowObject.at(-1);
    // 今の下の下に配列がある場合は次の配列を検索する、そうでなければ今の配列を返す
    if (Array.isArray(nowObject.at(-1).at(-1))) {
        colon(nowObject.at(-1));
    } else {
        return nowObject;
    }
}
*/

// 最後から数え指定の深さにある配列に要素を追加
function colon(array, depth) {
    // 地のobjectならそのままの配列を返す
    if (depth === 0) return array;
    // 深さがある場合、指定の深さに移動
    let nowArray=array;
    for(let k=0;k<depth;k++){
        nowArray=nowArray.at(-1)
    }
    return nowArray;
}