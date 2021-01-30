
const path = require('path');

module.exports = env => {
    const mode = env.production ? 'production' : 'development';

    return  {
        entry: {
            index: './src/index.ts'
        },
        target: 'node',
        output: {
            path: path.resolve(__dirname, "dist/askless"),
            filename: 'index.js',
            library: 'askless',
            libraryTarget: "umd",
            umdNamedDefine: true,
            globalObject: 'this',
        },
        plugins: [
            new (require('webpack')).DefinePlugin({
                'process.env.ENV': JSON.stringify(mode)
            }),
        ],
        mode: mode,
        resolve: {
            extensions: ['.ts', '.js', '.json']
        },
        module: {
            rules: [
                {
                    test: /\.ts$/,
                    exclude: /node_modules/,
                    use: [
                        {
                            loader: "babel-loader",
                            options: {
                                presets: [
                                    [
                                        "@babel/preset-env",
                                        {
                                            "targets": {
                                                "node":"current"
                                            }
                                        }
                                    ]
                                ],
                            },
                        },
                        {
                            loader: "ts-loader",
                        },
                    ],
                },
            ],
        },
    };
};
