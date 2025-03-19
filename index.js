const FILE_PATH = process.env.FILE_PATH || './.npm'; // 运行文件夹，节点文件存放目录
const projectPageURL = process.env.URL || '';        // 填写项目域名可开启自动访问保活，非标端口的前缀是http://
const intervalInseconds = process.env.TIME || 120;   // 自动访问间隔时间（120秒），这个也是上传间隔时间。
const UUID = process.env.UUID || '89c13786-25aa-4520-b2e7-12cd60fb5202';
const CFIP = process.env.CFIP || 'ip.sb';                         // 优选域名或优选ip
const CFPORT = process.env.CFPORT || '443';                         // 节点端口 443 2053 2083 2087 2096 8443
const VLPATH = process.env.VLPATH || 'startvl';
const VMPATH = process.env.VMPATH || 'startvm';
const ARGO_PORT = process.env.ARGO_PORT || 8080;                  // argo端口，使用固定隧道token需和cf后台设置的端口对应
const SNI = process.env.SNI || 'www.yahoo.com';
const SUB_URL = process.env.SUB_URL || 'https://sub.smartdns.eu.org/upload-ea4909ef-7ca6-4b46-bf2e-6c07896ef338';

const ARGO_DOMAIN = process.env.ARGO_DOMAIN || '';                // 固定隧道域名，留空即启用临时隧道
const ARGO_AUTH = process.env.ARGO_AUTH || '';                    // 固定隧道json或token，留空即启用临时隧道

const NEZHA_SERVER = process.env.NEZHA_SERVER || 'nazhe.841013.xyz';  // 哪吒3个变量不全不运行
const NEZHA_PORT = process.env.NEZHA_PORT || '443';                     // 哪吒端口为{443,8443,2096,2087,2083,2053}其中之一时开启tls
const NEZHA_KEY = process.env.NEZHA_KEY || 'IUT9MCT6khVYWe7pNY';        // 哪吒客户端密钥
const SUB_NAME = process.env.SUB_NAME || 'Appwrite.io';          // 节点名称

const PORT = process.env.PORT || process.env.SERVER_PORT || 3000;  // 只用argo时启用这行,注释下行
// const PORT = process.env.PORT || 3000;

const REAL_PORT = process.env.REAL_PORT;  // 不使用reality时也就是只用argo时不填数字,启用这行，注释下行
//const REAL_PORT = process.env.REAL_PORT || process.env.SERVER_PORT || 7860;

// 填好变量后到网站全混淆  https://www.obfuscator.io/#code
const axios = require("axios");
const os = require('os');
const fs = require("fs");
const path = require("path");
const http = require('http');
const https = require('https');
const exec = require("child_process").exec;
const { execSync } = require('child_process');

// 创建文件夹
function createFolder(folderPath) {
    if (!fs.existsSync(folderPath)) {
        fs.mkdirSync(folderPath);
        // console.log(`${folderPath} is created`);
    } else {
        // console.log(`${folderPath} already exists`);
    }
}

// 创建运行文件夹
createFolder(FILE_PATH);

// 清理历史文件
const pathsToDelete = ['xconf', 'bot', 'web', 'npm', 'log.txt', 'boot.log'];
function cleanupOldFiles() {
    pathsToDelete.forEach((file) => {
        const filePath = path.join(FILE_PATH, file);

        try {
            if (fs.existsSync(filePath)) {
                if (fs.statSync(filePath).isDirectory()) {
                    fs.rmSync(filePath, { recursive: true });
                    console.log(`${filePath} deleted`);
                } else {
                    fs.unlinkSync(filePath);
                    console.log(`${filePath} deleted`);
                }
            } else {
                console.error(`Skip Delete ${filePath}`);
            }
        } catch (err) {
            console.error(`Failed to delete ${filePath}: ${err}`);
        }
    });
}
cleanupOldFiles();

// 创建 xconf 文件夹
createFolder(path.join(FILE_PATH, 'xconf'));
const configpath = path.join(FILE_PATH, 'xconf');
// 延时参数,ms是毫秒 1000ms=1秒
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 玩具单端口用直连时sub无效
const server = http.createServer((req, res) => {
    if (req.url === '/') {
        res.writeHead(200);
        res.end('hello world');
    } else if (req.url === '/healthcheck') {
        res.writeHead(200);
        res.end('ok');
    } else if (req.url === '/sub') {
        const subFilePath = FILE_PATH + '/log.txt';
        fs.readFile(subFilePath, 'utf8', (error, data) => {
            if (error) {
                res.writeHead(500);
                res.end('Error reading file');
            } else {
                res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
                res.end(data);
            }
        });
    } else {
        res.writeHead(404);
        res.end('Not found');
    }
});

// 生成私钥值
async function generateKeysAndShortID() {
    try {
        // 假设你的脚本生成两行输出，一行是私钥，一行是公钥
        let X25519Key = execSync(`${FILE_PATH}/web x25519`, { encoding: 'utf8' });
        let lines = X25519Key.trim().split('\n');
        let privateKey = lines[0].split(/\s+/)[2]; // 是从一个数组中获取第一个元素，根据空格分割为多个部分，并将其中第三部分作为私钥并赋值给privateKey变量
        let publicKey = lines[lines.length - 1].split(/\s+/)[2]; // 是从包含多行字符串的数组中获取最后一行，根据空格分割为多个部分，并将其中第三部分作为公钥并赋值给publicKey变量

        // 执行 openssl 命令生成 shortID
        let shortidResult = execSync('openssl rand -hex 8', { encoding: 'utf8' });
        let shortID = shortidResult.trim(); // 去除输出两端的空白字符

        // console.log("Private Key:", privateKey);
        // console.log("Public Key:", publicKey);
        // console.log("Short ID:", shortID);

        // 返回生成的密钥和ShortID
        return {
            privateKey,
            publicKey,
            shortID
        };
    } catch (error) {
        console.error(`执行命令出错: ${error}`);
        // 如果有错误，可以返回一个错误对象或null
        return null;
    }
}

// cf请求函数
async function getCloudflareMeta() {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'speed.cloudflare.com',
            path: '/meta',
            method: 'GET',
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                const parsedData = JSON.parse(data);
                resolve(parsedData);
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.end();
    });
}

// 生成xray配置文件
async function myconfig() {
    const result = await generateKeysAndShortID();
    return new Promise((resolve) => {
        setTimeout(() => {
            const { privateKey, publicKey, shortID } = result;
            PrivateKey = process.env.PrivateKey || privateKey;
            PublicKey = process.env.PublicKey || publicKey;
            ShortID = process.env.ShortID || shortID;
            const vlpath = '/' + VLPATH;
            const vmpath = '/' + VMPATH;
            SNISERVER = `${SNI}:443`;

            function generateConfig() {
                const inbound = {
                    "log": {
                        "access": "/dev/null",
                        "error": "/dev/null",
                        "loglevel": "none"
                    },
                    "dns": {
                        "servers": [
                            "https+local://8.8.8.8/dns-query"
                        ]
                    },
                    "inbounds": [
                        {
                            "port": ARGO_PORT,
                            "protocol": "vless",
                            "settings": {
                                "clients": [
                                    {
                                        "id": UUID,
                                        "flow": "xtls-rprx-vision"
                                    }
                                ],
                                "decryption": "none",
                                "fallbacks": [
                                    {
                                        "path": vlpath,
                                        "dest": 3002
                                    },
                                    {
                                        "path": vmpath,
                                        "dest": 3003
                                    }
                                ]
                            },
                            "streamSettings": {
                                "network": "tcp"
                            }
                        },
                        {
                            "port": 3002,
                            "listen": "127.0.0.1",
                            "protocol": "vless",
                            "settings": {
                                "clients": [
                                    {
                                        "id": UUID,
                                        "level": 0
                                    }
                                ],
                                "decryption": "none"
                            },
                            "streamSettings": {
                                "network": "ws",
                                "security": "none",
                                "wsSettings": {
                                    "path": vlpath
                                }
                            },
                            "sniffing": {
                                "enabled": true,
                                "destOverride": [
                                    "http",
                                    "tls",
                                    "quic"
                                ],
                                "metadataOnly": false
                            }
                        },
                        {
                            "port": 3003,
                            "listen": "127.0.0.1",
                            "protocol": "vmess",
                            "settings": {
                                "clients": [
                                    {
                                        "id": UUID,
                                        "alterId": 0
                                    }
                                ]
                            },
                            "streamSettings": {
                                "network": "ws",
                                "wsSettings": {
                                    "path": vmpath
                                }
                            },
                            "sniffing": {
                                "enabled": true,
                                "destOverride": [
                                    "http",
                                    "tls",
                                    "quic"
                                ],
                                "metadataOnly": false
                            }
                        }
                    ]
                };
                fs.writeFileSync(path.join(configpath, 'inbound.json'), JSON.stringify(inbound, null, 2));

                if (REAL_PORT) {
                    const inbound_r = {
                        "inbounds": [
                            {
                                "tag": "reality-vision",
                                "protocol": "vless",
                                "port": REAL_PORT,
                                "settings": {
                                    "clients": [
                                        {
                                            "id": UUID,
                                            "flow": "xtls-rprx-vision"
                                        }
                                    ],
                                    "decryption": "none",
                                    "fallbacks": [
                                        {
                                            "dest": "3001",
                                            "xver": 1
                                        }
                                    ]
                                },
                                "streamSettings": {
                                    "network": "tcp",
                                    "security": "reality",
                                    "realitySettings": {
                                        "show": true,
                                        "dest": SNISERVER,
                                        "xver": 0,
                                        "serverNames": [
                                            SNI
                                        ],
                                        "privateKey": PrivateKey,
                                        "publicKey": PublicKey,
                                        "maxTimeDiff": 70000,
                                        "shortIds": [
                                            ""
                                        ]
                                    }
                                },
                                "sniffing": {
                                    "enabled": true,
                                    "destOverride": [
                                        "http",
                                        "tls",
                                        "quic"
                                    ],
                                    "metadataOnly": false
                                }
                            },
                            {
                                "port": 3001,
                                "listen": "127.0.0.1",
                                "protocol": "vless",
                                "tag": "reality-grpc",
                                "settings": {
                                    "clients": [
                                        {
                                            "id": UUID,
                                            "flow": ""
                                        }
                                    ],
                                    "decryption": "none"
                                },
                                "streamSettings": {
                                    "network": "grpc",
                                    "grpcSettings": {
                                        "serviceName": "grpc",
                                        "multiMode": true
                                    },
                                    "sockopt": {
                                        "acceptProxyProtocol": true
                                    }
                                },
                                "sniffing": {
                                    "enabled": true,
                                    "destOverride": [
                                        "http",
                                        "tls",
                                        "quic"
                                    ],
                                    "metadataOnly": false
                                }
                            }
                        ]
                    };
                    fs.writeFileSync(path.join(configpath, 'inbound_r.json'), JSON.stringify(inbound_r, null, 2));
                }

                const outbound = {
                    "outbounds": [
                        {
                            "protocol": "freedom",
                            "tag": "direct"
                        },
                        {
                            "tag": "WARP",
                            "protocol": "wireguard",
                            "settings": {
                                "secretKey": "YFYOAdbw1bKTHlNNi+aEjBM3BO7unuFC5rOkMRAz9XY=",
                                "address": [
                                    "172.16.0.2/32",
                                    "2606:4700:110:8a36:df92:102a:9602:fa18/128"
                                ],
                                "peers": [
                                    {
                                        "publicKey": "bmXOC+F1FxEMF9dyiK2H5/1SUtzH0JuVo51h2wPfgyo=",
                                        "allowedIPs": [
                                            "0.0.0.0/0",
                                            "::/0"
                                        ],
                                        "endpoint": "162.159.193.10:2408"
                                    }
                                ],
                                "reserved": [78, 135, 76],
                                "mtu": 1280
                            }
                        }
                    ],
                    "routing": {
                        "domainStrategy": "AsIs",
                        "rules": [
                            {
                                "type": "field",
                                "domain": [
                                    "domain:openai.com",
                                    "domain:ai.com"
                                ],
                                "outboundTag": "$CHAT_GPT_OUT"
                            }
                        ]
                    }
                };
                fs.writeFileSync(path.join(configpath, 'outbound.json'), JSON.stringify(outbound, null, 2));
            }

            generateConfig();

            resolve(PublicKey);
        }, 2000);
    });
}

// 判断系统架构
function getSystemArchitecture() {
    const arch = os.arch();
    if (arch === 'arm' || arch === 'arm64' || arch === 'aarch64') {
        return 'arm';
    } else {
        return 'amd';
    }
}

// 下载对应系统架构的依赖文件
function downloadFile(fileName, fileUrl, callback) {
    const filePath = path.join(FILE_PATH, fileName);
    const writer = fs.createWriteStream(filePath);

    axios({
        method: 'get',
        url: fileUrl,
        responseType: 'stream',
    })
    .then(response => {
        response.data.pipe(writer);

        writer.on('finish', () => {
            writer.close();
            console.log(`Download ${fileName} successfully`);
            callback(null, fileName);
        });

        writer.on('error', err => {
            fs.unlink(filePath, () => { });
            const errorMessage = `Download ${fileName} failed: ${err.message}`;
            console.error(errorMessage); // 下载失败时输出错误消息
            callback(errorMessage);
        });
    })
    .catch(err => {
        const errorMessage = `Download ${fileName} failed: ${err.message}`;
        console.error(errorMessage); // 下载失败时输出错误消息
        callback(errorMessage);
    });
}

// 下载并运行依赖文件
async function downloadFiles() {
    const architecture = getSystemArchitecture();
    const filesToDownload = getFilesForArchitecture(architecture);

    if (filesToDownload.length === 0) {
        console.log(`Can't find a file for the current architecture`);
        return;
    }

    const downloadPromises = filesToDownload.map(fileInfo => {
        return new Promise((resolve, reject) => {
            downloadFile(fileInfo.fileName, fileInfo.fileUrl, (err, fileName) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(fileName);
                }
            });
        });
    });

    try {
        await Promise.all(downloadPromises); // 等待所有文件下载完成
    } catch (err) {
        console.error('Error downloading files:', err);
        return;
    }

    // 授权和运行
    function authorizeFiles(filePaths) {
        const newPermissions = 0o775;

        filePaths.forEach(relativeFilePath => {
            const absoluteFilePath = path.join(FILE_PATH, relativeFilePath);

            fs.chmod(absoluteFilePath, newPermissions, (err) => {
                if (err) {
                    console.error(`Empowerment failed for ${absoluteFilePath}: ${err}`);
                } else {
                    console.log(`Empowerment success for ${absoluteFilePath}: ${newPermissions.toString(8)}`);
                }
            });
        });
    }
    const filesToAuthorize = ['./bot', './web', './npm'];
    authorizeFiles(filesToAuthorize);
}

// 根据系统架构返回对应的url
function getFilesForArchitecture(architecture) {
    if (architecture === 'arm') {
        return [
            { fileName: "bot", fileUrl: "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64" },
            { fileName: "web", fileUrl: "https://github.com/mytcgd/myfiles/releases/download/main/xray_arm" },
            { fileName: "npm", fileUrl: "https://raw.githubusercontent.com/zhangbin0301/myfiles/refs/heads/main/agentArm" },
        ];
    } else if (architecture === 'amd') {
        return [
            { fileName: "bot", fileUrl: "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64" },
            { fileName: "web", fileUrl: "https://github.com/mytcgd/myfiles/releases/download/main/xray" },
            { fileName: "npm", fileUrl: "https://raw.githubusercontent.com/zhangbin0301/myfiles/refs/heads/main/agentX86" },
        ];
    }
    return [];
}

// 获取固定隧道json
function argoType() {
    if (!ARGO_AUTH || !ARGO_DOMAIN) {
        // console.log("ARGO_DOMAIN or ARGO_AUTH variable is empty, use quick tunnels");
        return;
    }

    if (ARGO_AUTH.includes('TunnelSecret')) {
        fs.writeFileSync(path.join(FILE_PATH, 'tunnel.json'), ARGO_AUTH);
        const tunnelYaml = `
        tunnel: ${ARGO_AUTH.split('"')[11]}
        credentials-file: ${path.join(FILE_PATH, 'tunnel.json')}
        protocol: http2

        ingress:
        - hostname: ${ARGO_DOMAIN}
        service: http://localhost:${ARGO_PORT}
        originRequest:
        noTLSVerify: true
        - service: http_status:404
        `;
        fs.writeFileSync(path.join(FILE_PATH, 'tunnel.yml'), tunnelYaml);
    } else {
        // console.log("ARGO_AUTH mismatch TunnelSecret,use token connect to tunnel");
    }
}
argoType();

// 运行
async function runapp() {
    // 运行cloudfared
    if (fs.existsSync(path.join(FILE_PATH, 'bot'))) {
        let args;

        if (ARGO_AUTH.match(/^[A-Z0-9a-z=]{120,250}$/)) {
            args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 run --token ${ARGO_AUTH}`;
        } else if (ARGO_AUTH.match(/TunnelSecret/)) {
            args = `tunnel --edge-ip-version auto --config ${FILE_PATH}/tunnel.yml run`;
        } else {
            args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${FILE_PATH}/boot.log --loglevel info --url http://localhost:${ARGO_PORT}`;
        }

        try {
            await exec(`nohup ${FILE_PATH}/bot ${args} >/dev/null 2>&1 &`);
            console.log('bot is running');
            await delay(2000);
        } catch (error) {
            console.error(`Error executing command: ${error}`);
        }
    }
    await delay(5000);

    // 运行xray
    if (fs.existsSync(path.join(FILE_PATH, 'web'))) {
        const command1 = `nohup ${FILE_PATH}/web run -confdir ${FILE_PATH}/xconf/ > /dev/null 2>&1 &`;
        try {
            await exec(command1);
            console.log('web is running');
            await delay(2000);
        } catch (error) {
            console.error(`web running error: ${error}`);
        }
    }

    // 运行nezha
    if (fs.existsSync(path.join(FILE_PATH, 'npm'))) {
        let NEZHA_TLS = '';
        if (NEZHA_SERVER && NEZHA_PORT && NEZHA_KEY) {
            const tlsPorts = ['443', '8443', '2096', '2087', '2083', '2053'];
            if (tlsPorts.includes(NEZHA_PORT)) {
                NEZHA_TLS = '--tls';
            } else {
                NEZHA_TLS = '';
            }
            const command = `nohup ${FILE_PATH}/npm -s ${NEZHA_SERVER}:${NEZHA_PORT} -p ${NEZHA_KEY} ${NEZHA_TLS} >/dev/null 2>&1 &`;
            try {
                await exec(command);
                console.log('npm is running');
                await delay(1000);
            } catch (error) {
                console.error(`npm running error: ${error}`);
            }
        } else {
            console.log('npm variable is empty,skip running');
        }
    }
}

// 获取argoDomain
async function extractDomains() {
    let argoDomain;

    if (ARGO_AUTH && ARGO_DOMAIN) {
        argoDomain = ARGO_DOMAIN;
        // console.log('ARGO_DOMAIN:', argoDomain);
        await generateLinks(argoDomain);
    } else {
        try {
            await delay(10000);
            const bootfilePath = path.join(FILE_PATH, 'boot.log');
            if (fs.existsSync(bootfilePath) && fs.statSync(bootfilePath).size > 0) {
                const fileContent = fs.readFileSync(bootfilePath, 'utf-8');
                const regex = /info.*https:\/\/(.*trycloudflare\.com)/g;
                let match;
                let lastMatch = null;

                while ((match = regex.exec(fileContent)) !== null) {
                    lastMatch = match[1];
                }

                if (lastMatch) {
                    argoDomain = lastMatch;
                }
                // console.log('ARGO_DOMAIN:', argoDomain);
                await generateLinks(argoDomain);
            } else {
                exec("pidof bot", async (err, stdout) => {
                    if (stdout.trim() !== "") {
                        // console.log('Bot is already running.');
                    } else {
                        const args = `tunnel --edge-ip-version auto --no-autoupdate --protocol http2 --logfile ${FILE_PATH}/boot.log --loglevel info --url http://localhost:${ARGO_PORT}`;
                        const command2 = `nohup ${FILE_PATH}/bot ${args} >/dev/null 2>&1 &`;
                        exec(command2, async (err) => {
                            if (err) {
                                console.error(`Error starting bot: ${err}`);
                            } else {
                                // console.log('Bot started successfully.');
                                await delay(3000);
                                await extractDomains();
                            }
                        });
                    }
                });
            }
        } catch (error) {
            // console.error('Error reading boot.log:', error);
        }
    }
}

// 生成sub
let UPLOAD_DATA;
let previousArgoDomain = '';
async function generateLinks(argoDomain) {
    let ISP, MYIP, VMESS, vmess_url, vless_url, realitytcp_url, realitygrpc_url, subTxt;

    if (previousArgoDomain && argoDomain === previousArgoDomain) {
        // console.log('ArgoDomain has not changed. Skipping writing to log.txt.');
        return;
    }

    // 用https向cfapi发送请求,获取ip及isp
    try {
        let data = await getCloudflareMeta();
        let SERVERIP = data.clientIp;

        let fields1 = data.country;
        let fields2 = data.asOrganization;
        ISP = (fields1 + '-' + fields2).replace(/ /g, '_');
        // console.log(ISP);

        if (SERVERIP.includes(':')) {
            MYIP = `[${SERVERIP}]`;
        } else {
            MYIP = `${SERVERIP}`;
        }
        // console.log(MYIP);

        // VMESS = { v: '2', ps: `${ISP}-${SUB_NAME}`, add: CFIP, port: CFPORT, id: UUID, aid: '0', scy: 'none', net: 'ws', type: 'none', host: argoDomain, path: '/startvm?ed=2048', tls: 'tls', sni: argoDomain, alpn: '' };
        VMESS = {
            v: '2',
            ps: `${ISP}-${SUB_NAME}`,
            add: CFIP,
            port: CFPORT,
            id: UUID,
            aid: '0',
            scy: 'none',
            net: 'ws',
            type: 'none',
            host: argoDomain,
            path: `/${VMPATH}?ed=2048`,
            tls: 'tls',
            sni: argoDomain,
            alpn: ''
        };

        vmess_url = `vmess://${Buffer.from(JSON.stringify(VMESS)).toString('base64')}`;
        vless_url = `vless://${UUID}@${CFIP}:${CFPORT}?host=${argoDomain}&path=%2F${VLPATH}?ed=2048&type=ws&encryption=none&security=tls&sni=${argoDomain}#${ISP}-${SUB_NAME}`;
        realitytcp_url = `vless://${UUID}@${MYIP}:${REAL_PORT}?encryption=none&flow=xtls-rprx-vision&security=reality&sni=${SNI}&fp=chrome&pbk=${PublicKey}&type=tcp&headerType=none#${ISP}-${SUB_NAME}-realitytcp`;
        realitygrpc_url = `vless://${UUID}@${MYIP}:${REAL_PORT}?security=reality&sni=${SNI}&fp=chrome&pbk=${PublicKey}&type=grpc&serviceName=grpc&encryption=none#${ISP}-${SUB_NAME}-realitygrpc`;

        subTxt = `${vmess_url}\n${vless_url}`;
        if (REAL_PORT) {
            subTxt = `${subTxt}\n${realitytcp_url}\n${realitygrpc_url}`;
        }

        // reality只上传realitytcp
        if (SUB_URL) {
            UPLOAD_DATA = `${vless_url}`;
            if (REAL_PORT) {
                UPLOAD_DATA = `${UPLOAD_DATA}\n${realitytcp_url}`;
            }
        }

        // 打印 log.txt 内容到控制台
        // console.log(Buffer.from(subTxt).toString('base64'));
        const filePath = path.join(FILE_PATH, 'log.txt');
        fs.writeFileSync(filePath, Buffer.from(subTxt).toString('base64'));

        previousArgoDomain = argoDomain; // Update the previous argoDomain
    } catch (error) {
        // console.error('Error:', error);
    }
}

// 上传函数
async function uploadSubscription(SUB_NAME, UPLOAD_DATA, SUB_URL) {
    const data = JSON.stringify({ URL_NAME: SUB_NAME, URL: UPLOAD_DATA });

    const options = {
        hostname: new URL(SUB_URL).hostname,
        port: 443, // Assuming HTTPS
        path: new URL(SUB_URL).pathname,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': data.length
        }
    };

    return new Promise((resolve, reject) => {
        const req = https.request(options, (res) => {
            let responseBody = '';
            res.on('data', (chunk) => {
                responseBody += chunk;
            });

            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(responseBody);
                } else {
                    reject(new Error(`Upload failed with status code: ${res.statusCode}`));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(data);
        req.end();
    });
}

// 上传订阅
async function subupload() {
    await extractDomains();
    // console.log(UPLOAD_DATA);
    await uploadSubscription(SUB_NAME, UPLOAD_DATA, SUB_URL)
    .then((response) => {
        // console.log('Upload successful:', response);
    })
    .catch((error) => {
        // console.error('Upload failed:', error);
    });
}

// 2分钟后删除多余文件
function cleanfiles() {
    setTimeout(() => {
        const filesToDelete = [
            `${FILE_PATH}/bot`,
            `${FILE_PATH}/web`,
            `${FILE_PATH}/npm`,
            `${FILE_PATH}/xconf`
        ];

        filesToDelete.forEach(filePath => {
            try {
                if (fs.existsSync(filePath)) {
                    if (fs.lstatSync(filePath).isDirectory()) {
                        fs.rmSync(filePath, { recursive: true }); // 递归删除目录
                    } else {
                        fs.unlinkSync(filePath); // 删除文件
                    }
                    // console.log(`已删除文件: ${filePath}`);
                }
            } catch (error) {
                // console.error(`删除文件 ${filePath} 失败: ${error}`);
            }
        });

        console.clear()
        console.log('App is running');
    }, 120000); // 120秒后
}
cleanfiles();

// 自动访问项目URL
let hasLoggedEmptyMessage = false;
async function visitProjectPage() {
    try {
        // 如果URL和TIME变量为空时跳过访问项目URL
        if (!projectPageURL || !intervalInseconds) {
            if (!hasLoggedEmptyMessage) {
                // console.log("URL or TIME variable is empty,skip visit url");
                hasLoggedEmptyMessage = true;
            }
            return;
        } else {
            hasLoggedEmptyMessage = false;
        }

        await axios.get(projectPageURL);
        // console.log(`Visiting project page: ${projectPageURL}`);
        console.log('Page visited successfully');
        console.clear()
    } catch (error) {
        console.error('Error visiting project page:', error.message);
    }
}
setInterval(visitProjectPage, intervalInseconds * 1000);

// 回调运行
async function startserver() {
    await downloadFiles();
    await delay(5000);
    await myconfig();
    await runapp();
    await extractDomains();
    visitProjectPage();
    if (SUB_URL) {
        // 定时任务
        await setInterval(subupload, intervalInseconds * 1000);
        // await setInterval(subupload, 100000); // 100 秒
    }
}
startserver();

server.listen(PORT, () => {
    console.log(`server is running on port : ${PORT}`);
});
