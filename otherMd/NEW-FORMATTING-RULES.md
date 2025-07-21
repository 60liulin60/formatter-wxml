# 新的格式化规则

本文档展示了WXML格式化器的新格式化规则和效果。

## 格式化规则

### 1. `<text></text>` 标签不换行

`<text>` 标签及其内容保持在同一行，不进行换行处理。

**示例：**

```xml
<!-- 格式化前 -->
<text wx:if="{{user.isVip}}">VIP用户</text><text wx:elif="{{user.isActive}}">活跃用户</text>

<!-- 格式化后 -->
<text wx:if="{{user.isVip}}">VIP用户</text><text wx:elif="{{user.isActive}}">活跃用户</text>
```

### 2. `<image>` 标签自动转换为自闭合标签

`<image>` 标签自动转换为自闭合格式 `<image ... />`。

**示例：**

```xml
<!-- 格式化前 -->
<image src="{{user.avatar}}" class="avatar" mode="aspectFit" bind:tap="onImageTap"></image>

<!-- 格式化后 -->
<image src="{{user.avatar}}" class="avatar" mode="aspectFit" bind:tap="onImageTap" />
```

### 3. 属性超过3个时自动换行

当标签属性超过3个时，从第二个属性开始换行，并保持适当的缩进。

**示例：**

```xml
<!-- 格式化前 -->
<button wx:if="{{item.canEdit}}" bind:tap="onEdit" data-id="{{item.id}}" class="edit-btn" disabled="{{loading}}">编辑按钮</button>

<!-- 格式化后 -->
<button wx:if="{{item.canEdit}}"
  bind:tap="onEdit"
  data-id="{{item.id}}"
  class="edit-btn"
  disabled="{{loading}}">编辑按钮</button>
```

### 4. 体现标签的层级关系

通过适当的缩进来体现标签的嵌套层级关系。

**示例：**

```xml
<!-- 格式化前 -->
<view class="container"><text wx:if="{{user.isVip}}">VIP用户</text><view wx:if="{{showDetails}}"><text>详细信息：{{user.details}}</text><button wx:if="{{canEdit}}" bind:tap="onEdit">编辑</button></view></view>

<!-- 格式化后 -->
<view class="container"><text wx:if="{{user.isVip}}">VIP用户</text>
  <view wx:if="{{showDetails}}"><text>详细信息：{{user.details}}</text><button wx:if="{{canEdit}}"
      bind:tap="onEdit">编辑</button></view>
</view>
```

## 完整示例

### 原始代码

```xml
<view class="container"><text wx:if="{{user.isVip}}">VIP用户</text><text wx:elif="{{user.isActive}}">活跃用户</text><text wx:else>普通用户</text><view wx:if="{{showDetails}}"><text>详细信息：{{user.details}}</text><button wx:if="{{canEdit}}" bind:tap="onEdit">编辑</button></view><image src="{{user.avatar}}" class="avatar" mode="aspectFit" bind:tap="onImageTap"></image><button wx:if="{{item.canEdit}}" bind:tap="onEdit" data-id="{{item.id}}" class="edit-btn" disabled="{{loading}}">编辑按钮</button></view>
```

### 格式化后

```xml
<view class="container"><text wx:if="{{user.isVip}}">VIP用户</text><text wx:elif="{{user.isActive}}">活跃用户</text><text
    wx:else>普通用户</text>
  <view wx:if="{{showDetails}}"><text>详细信息：{{user.details}}</text><button wx:if="{{canEdit}}"
      bind:tap="onEdit">编辑</button></view>
  <image src="{{user.avatar}}" class="avatar" mode="aspectFit" bind:tap="onImageTap" /><button wx:if="{{item.canEdit}}"
    bind:tap="onEdit" data-id="{{item.id}}" class="edit-btn" disabled="{{loading}}">编辑按钮</button>
</view>
```

## 规则特点

1. **保持可读性**：通过合理的换行和缩进，使代码结构清晰
2. **遵循WXML特性**：针对微信小程序WXML的特殊语法进行优化
3. **智能处理**：根据标签类型和属性数量智能应用不同的格式化规则
4. **层级清晰**：通过缩进明确显示标签的嵌套关系

## 配置选项

可以通过VSCode设置调整格式化行为：

```json
{
  "wxml-formatter.indentSize": 2,
  "wxml-formatter.maxLineLength": 120,
  "wxml-formatter.preserveNewlines": true
}
```

- `indentSize`: 缩进空格数（默认：2）
- `maxLineLength`: 最大行长度（默认：120）
- `preserveNewlines`: 是否保留现有换行（默认：true）
