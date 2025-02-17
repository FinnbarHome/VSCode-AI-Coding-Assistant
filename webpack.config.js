const path = require('path');

module.exports = {
    mode: 'development',
    entry: {
        webview: './src/webview.tsx',
        extension: './src/extension.ts'
    },    
    output: {
        path: path.resolve(__dirname, 'out'),
        filename: 'webview.js',
        libraryTarget: 'umd'
    },
    module: {
        rules: [
            {
                test: /\.(ts|tsx)$/,
                exclude: /node_modules/,
                use: 'ts-loader'
            }
        ]
    },
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    externals: {
        vscode: 'commonjs vscode' 
    }
};
