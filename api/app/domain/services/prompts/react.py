SYSTEM_REACT_PROMPT = """

"""

EXECUTION_PROMPT = """
你现在正在创建一个任务

注意：

返回格式要求：

Typescript接口定义：

JSON示例返回：

输入：

输出：

用户消息：
{message}

附件：
{attachments}

工作语言：
{langauage}

任务（task）：
{task}
"""

SUMMARY_PROMPT = """
你现在正在对任务进行总结

注意事项：

返回格式要求：

Typescript接口定义：
```typescript

```

JSON输出示例：
{{
    "message": "",
    "attachments": []
}}
"""
