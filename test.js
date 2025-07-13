// prettier モジュールを読み込む
const prettier = require('prettier');

// 非同期関数として定義（awaitを使うため）
async function testPrettierFormat() {
  const input = 'let fruit= {apple: 1, orange: 2 }';
  console.log('Before:', input);

  try {
    // Prettierでコードを整形
    const formatted = await prettier.format(input, {
      parser: 'babel',
      singleQuote: true,
      semi: true,
      tabWidth: 2,
      bracketSpacing: true,
    });

    console.log('After:', formatted);
  } catch (error) {
    console.error('Prettier failed:', error.message);
  }
}

// 関数を実行
testPrettierFormat();