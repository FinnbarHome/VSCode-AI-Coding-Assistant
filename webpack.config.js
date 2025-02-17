const path = require('path');

module.exports = [
    // Webview Configuration (React)
    {
        mode: 'development',
        entry: {
            webview: './src/webview.tsx',
        },
        output: {
            path: path.resolve(__dirname, 'out'),
            filename: '[name].js',
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
        target: 'web',  
        devtool: false   
    },

    // Extension Configuration (VSCode backend)
    {
        mode: 'development',
        entry: {
            extension: './src/extension.ts'
        },
        output: {
            path: path.resolve(__dirname, 'out'),
            filename: '[name].js',
            libraryTarget: 'commonjs2' 
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
        target: 'node',  
        externals: {
            vscode: 'commonjs vscode',  
            path: 'commonjs path',
            fs: 'commonjs fs',
            os: 'commonjs os',
            crypto: 'commonjs crypto'
        }
    }
];
