let searchLines = [
    'function func() {',
    '  let person = {',
    "    name: 'kanade',",
    '    age: 18 ,',
    '  };',
    '  console.log();',
    '}'
]
// suggestするべき全ての変数が入った配列
const itemWords = [];
for (let k = 0; k < searchLines.length; k++) {
    // 長さが0=空の行だったらcontinue
    if (searchLines[k].length === 0) continue;
    let line = searchLines[k].trim();
    // 関数の宣言から始まった文でなければcontinue
    if (!["const", "let", "var"].includes(line.split(' ')[0])) continue;

    // =の後に{を含まないなら変数、含むならobjectと認識させる
    if (!line.includes('{')) {
        // 単語をspaceで区切り、2つ目の単語=宣言後の単語=変数名をvariableに保存
        let variable = line.split(' ')[1];
        // 文末がセミコロンだったら取り除く
        variable = variable.split(";")[0]
        itemWords.push(variable);
    } else {	// object
        console.log("a")
        // object名と要素名を入れた配列
        let nowObject = [];
        // count="{" - "}"の個数
        let count = null;
        while (count !== 0) {
            console.log(count,nowObject)
            // 1回目はwhileから抜けないようにcountを設定
            if (count === null) count = 0;
            let phrases = line.split(' ');
            for (let l = 0; l < phrases.length; l++) {
                // ここでは{が1つの場合のみ考えている
                if (phrases[l].includes('{')) {
                    nowObject[0] = phrases[l - 2];
                    count++;
                } else if (phrases[l].includes(':')) {
                    nowObject.push(phrases[l].split(":")[0])
                } else if (phrases[l].includes('}')) {
                    count--;
                }
            }
            if (count !== 0) {
                k++;
                // 長さが0=空の行だったら行が出るまで足し続ける
                while (searchLines[k].length === 0) k++;
                line = searchLines[k].trim();
            }
        }
        // objectの一番低階層の変数も表示できるようにする
        itemWords.push(nowObject[0])
        // 要素の最深部まで含めたものを変数として表示
        for (let l = 1; l < nowObject.length; l++) {
            let word = nowObject[0] + "." + nowObject[l]
            itemWords.push(word)
        }
    }
}