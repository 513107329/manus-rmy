# 日志输出
from core.config import get_settings
import logging
import sys


def setup_logging():
    # 获取logging配置
    settings = get_settings()

    # 设置日志级别
    root_logger = logging.getLogger()
    log_level = getattr(logging, settings.log_level)
    root_logger.setLevel(log_level)
    # log_file = settings.log_file

    # 日志输出格式
    formatter = logging.Formatter(
        "%(asctime)s-%(name)s-%(levelname)s-%(message)s", datefmt="%Y-%m-%d %H:%M:%S"
    )

    # 创建控制台日志输出处理器
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(log_level)
    console_handler.setFormatter(formatter)

    # 为root logger添加处理器
    root_logger.addHandler(console_handler)

    # logger初始化完毕
    root_logger.info("Logging initialized")
