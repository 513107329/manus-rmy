# 小明身高1.75，体重80.5kg。请根据BMI公式（体重除以身高的平方）帮小明计算他的BMI指数，并根据BMI指数：

# 低于18.5：过轻
# 18.5-25：正常
# 25-28：过重
# 28-32：肥胖
# 高于32：严重肥胖
# 用if-elif判断并打印结果：

age = 10

match age:
    case age if age <= 10:
        print("small")
    case 11:
        print("11")
    case 12 | 13 | 14 | 15 | 16:
        print("big")
    case _:
        print("unknown")
