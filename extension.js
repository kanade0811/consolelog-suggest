// requireはNode.jsの昨日、引数で外部モジュールを渡すとAPIを使用できるようになる
const vscode = require('vscode');
const prettier = require('prettier');

function activate(context) {
	// 指定した言語に対しsuggestを提供する
	const provider = vscode.languages.registerCompletionItemProvider(
		['javascript', 'typescript'], // この配列が有効になる言語

		{
			// オブジェクト内で、suggest候補を渡す際の関数を定義
			// document(今開いているファイルテキストに関するobject)とposition(カーソル位置)を引数
			provideCompletionItems: async function (document, position) {

				// line→カーソル位置の行全体が入った変数
				// linePrefix→カーソル行のうちカーソル前までの文字列を取得した変数
				const nowSentence = document.lineAt(position).text;
				const linePrefix = nowSentence.substring(0, position.character);

				// 文章.match(引数)→文章が引数と一致しているかを判別し、成功→文字列情報、失敗→nullをreturnする
				// バックスラッシュによりドットと括弧の始まりという文字そのものを指示
				// \s→空白文字(space、タブ、改行など)を*(0回以上繰り返す)　→　空白が0個以上あること
				// $→文章の末尾がこうなっていることを指定
				// if (!linePrefix.match(/\s*console\.log\(\s*$/)) return;
				if (!linePrefix.trim().includes("console.log(")) return;

				// ファイル内のテキストを文字列としてすべて取得
				const text = document.getText();

				let formattedText, lines;
				try {
					formattedText = await prettier.format(text, {
						parser: 'babel',
						singleQuote: true,
						semi: true,
						tabWidth: 2,
						bracketSpacing: true,
					});
					// 整形した文章を列ごとに分割し配列に保存
					lines = formattedText.trim().split('\n');
				} catch (err) {
					console.warn(`Prettier failed on full text\n→ ${err.message}`);
					// fallbackとして元のtextを使う（必要なら）
					lines = text.trim().split('\n');
				}

				// globalの行をすべて入れる配列
				let global = [];
				// functionの名前ごとにオブジェクトを作り、startとendの行数を記録
				let functions = [];
				// 現在cursorがいる位置
				let nowLine = vscode.window.activeTextEditor.selection.active.line;

				// 今いる行までのglobalとfunctionで配列分けする
				for (let k = 0; k < nowLine; k++) {
					let line = lines[k];
					// functionがある場合、配列functionsにobjectとして名前始まり行終わり行を追加
					if (line.startsWith("function")) {
						let functionObject = {};
						// spaceで区切ったものの1番目を"("で区切った0番目を配列名とする
						let functionName = line.split(' ')[1].split('(')[0].replace(/\s+/g, "");
						functionObject.name = functionName;
						functionObject.start = k;
						// {}の個数が合うまでfunctionとして認識させる
						let count = 1;
						k++;
						while (true) {
							if (k > lines.length - 1) break;
							line = lines[k];
							let words = line.split(' ');
							for (let word of words) {
								if (word.includes("{")) count++;
								if (word.includes("}")) count--;
							}
							// {}の数が一致したもしくはカーソルの行を超えたら、そこまでがfunctionだったということにする
							if (count === 0 || !(k < nowLine)) {
								functionObject.end = k;
								functions.push(functionObject);
								break;
							} else {
								k++;
							}
						}
					} else {
						global.push(line)
					}
				}

				// 今いるfunctionを特定
				let nowFunction = null;
				if (functions.length !== 0) {
					for (let object of functions) {
						if (nowLine >= object.start && nowLine <= object.end) {
							nowFunction = object;
							break
						}
					}
				}

				// スコープ内の行を抽出
				let searchLines = []
				searchLines = searchLines.concat(global)
				if (nowFunction !== null) {
					for (let k = nowFunction.start; k < nowFunction.end; k++) {
						if (k < nowLine) searchLines.push(lines[k]);
						if (k >= nowLine) break;
					}
				}

				// コメントアウトは除く
				let k = 0;
				while (k < searchLines.length) {
					let line = searchLines[k];
					// 複数行コメントアウトの場合
					if (line.includes("/*")) {
						// 始めのコメントアウトが文の初めか文中かで場合分け
						if (line.startsWith("/*")) {
							searchLines.splice(k, 1);
							if (!(k < searchLines.length)) break;
							line = searchLines[k];
						} else {
							searchLines[k] = searchLines[k].split("/*")[0];
							k++;
							if (!(k < searchLines.length)) break;
							line = searchLines[k];
						}
						while (true) {
							if (line.includes("*/")) {
								if (line.endsWith("*/")) {
									searchLines.splice(k, 1);
									if (!(k < searchLines.length)) break;
									line = searchLines[k];
									break;
								} else {
									searchLines[k] = searchLines[k].split("*/")[1];
									break;
								}
							} else {
								searchLines.splice(k, 1);
								if (!(k < searchLines.length)) break;
								line = searchLines[k];
							}
						}
						if (!(k < searchLines.length)) break;
						continue;
					}

					// スラッシュのコメントアウト後はその文を含めない
					if (line.includes("//")) {
						if (line.startsWith("//")) {
							searchLines.splice(k, 1);
							if (!(k < searchLines.length)) break;
							line = searchLines[k];
						} else {
							searchLines[k] = searchLines[k].split("//")[0];
						}
						continue;
					}

					k++;
					if (!(k < searchLines.length)) break;
				}

				console.log(searchLines)

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
								if (!(k < searchLines.length)) break;
								// 長さが0=空の行だったら行が出るまで足し続ける
								while (searchLines[k].length === 0) k++;
								line = searchLines[k].trim();
							}
							console.log("count:",count)
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

				console.log("itemWords:", itemWords)

				// 現在の入力を取得
				const nowWord = linePrefix.split('(')[1]
				// もし入力済みだったら、それに関するsuggestのみを出す
				if (nowWord) {
					for (let k = 0; k < itemWords.length; k++) {
						if (!itemWords[k].startsWith(nowWord)) {
							itemWords.splice(k, 1);
							k--;
						}
					}
				}

				// wordからsuggestを作成
				const items = [];
				for (let k = 0; k < itemWords.length; k++) {
					let variable = itemWords[k]
					// suggestを作成するクラスでobject作成
					// 第一引数は表示するsuggest、台に引数は候補の種類
					// vscode.CompletionItemKind.Snippet→便利なコードテンプレート(らしい)
					const item = new vscode.CompletionItem(
						`"${variable}:", ${variable}`,
						// variable,
						// vscode.CompletionItemKind.Snippet
						vscode.CompletionItemKind.Variable // Snippetより上に来やすい
					);

					// 実際にsuggestで入力する内容を指定
					item.insertText = new vscode.SnippetString(`"${variable}:", ${variable})`);
					// 削除＋置換したい範囲を設定
					const startPos = new vscode.Position(position.line, linePrefix.indexOf('(') + 1);
					const endPos = new vscode.Position(position.line, nowSentence.length);
					item.range = new vscode.Range(startPos, endPos);
					/*
					// 削除＋置換したい範囲を設定
					const startPos = new vscode.Position(position.line, linePrefix.indexOf('console.log('));
					const endPos = position;
					item.range = new vscode.Range(startPos, endPos);
					*/

					// ユーザーがこの変数名で検索してくることを想定
					item.filterText = variable;
					// 候補の右に表示される補足情報
					item.detail = `console.log("${variable}:", ${variable})`;
					// 候補にマウスを乗せたときに表示される説明
					item.documentation = new vscode.MarkdownString(`変数 ${variable} を出力するログ`);
					// 一番上にsuggestが表示されるようにする
					item.sortText = "0000" + variable;
					// 初期選択
					item.preselect = true;
					// 作った1つの補完候補を配列に追加
					if (!items.includes(item)) items.push(item);
				}

				// 変数が入った配列をreturnし、suggestに表示
				return items;

			}
		},

		// 「(」が入力されたときに補完候補を出す
		'(', '.', '[a-zA-Z0-9]'
	);

	// 拡張機能が無効化されたときにこの補完機能も自動で無効になる
	context.subscriptions.push(provider);
}

// 拡張機能が無効な時は何もしない
function deactivate() { }

// module.exports……Node.jsで使われるexportのようなもの
// package.jsonにてアクティブ・非アクティブを受け取りそれに応じた関数をVScodeに渡す
module.exports = {
	activate,
	deactivate
};