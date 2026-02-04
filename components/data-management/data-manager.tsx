"use client";

import { useState } from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  SortingState,
  useReactTable,
  VisibilityState,
} from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Download,
  Edit,
  MoreHorizontal,
  Plus,
  Search,
  Trash2,
  Upload,
} from "lucide-react";

// 通用数据项接口
export interface DataItem {
  id: string;
  enabled?: boolean;
  [key: string]: any;
}

// 数据管理器配置接口
export interface DataManagerConfig<T extends DataItem> {
  title: string;
  description?: string;
  columns: ColumnDef<T>[];
  searchPlaceholder?: string;
  searchKey?: string;
  emptyMessage?: string;
  allowAdd?: boolean;
  allowEdit?: boolean;
  allowDelete?: boolean;
  allowImport?: boolean;
  allowExport?: boolean;
  allowToggleEnabled?: boolean;
}

// 数据管理器属性接口
export interface DataManagerProps<T extends DataItem> {
  config: DataManagerConfig<T>;
  data: T[];
  onAdd?: (item: Omit<T, "id">) => void;
  onEdit?: (id: string, item: Partial<T>) => void;
  onDelete?: (id: string) => void;
  onToggleEnabled?: (id: string) => void;
  onImport?: (items: T[]) => void;
  onExport?: () => void;
  renderAddForm?: (
    onSubmit: (item: Omit<T, "id">) => void,
    onCancel: () => void,
  ) => React.ReactNode;
  renderEditForm?: (
    item: T,
    onSubmit: (item: Partial<T>) => void,
    onCancel: () => void,
  ) => React.ReactNode;
}

export function DataManager<T extends DataItem>({
  config,
  data,
  onAdd,
  onEdit,
  onDelete,
  onToggleEnabled,
  onImport,
  onExport,
  renderAddForm,
  renderEditForm,
}: DataManagerProps<T>) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [globalFilter, setGlobalFilter] = useState("");

  // 对话框状态
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedItem, setSelectedItem] = useState<T | null>(null);

  // 创建带启用/禁用和操作列的列定义
  const columnsWithActions: ColumnDef<T>[] = [
    // 启用/禁用列
    ...(config.allowToggleEnabled && typeof data[0]?.enabled !== "undefined"
      ? [{
        id: "enabled",
        header: "启用",
        cell: ({ row }: { row: any }) => {
          const item = row.original;
          return (
            <Checkbox
              checked={item.enabled}
              onCheckedChange={() => onToggleEnabled?.(item.id)}
              aria-label={`切换 ${
                item.name || item.category || item.type || item.id
              } 的启用状态`}
            />
          );
        },
      }]
      : []),
    ...config.columns,
    {
      id: "actions",
      header: "操作",
      cell: ({ row }) => {
        const item = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">打开菜单</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {config.allowEdit && (
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedItem(item);
                    setShowEditDialog(true);
                  }}
                >
                  <Edit className="mr-2 h-4 w-4" />
                  编辑
                </DropdownMenuItem>
              )}
              {config.allowDelete && (
                <DropdownMenuItem
                  onClick={() => {
                    setSelectedItem(item);
                    setShowDeleteDialog(true);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  删除
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const table = useReactTable({
    data,
    columns: columnsWithActions,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      globalFilter,
    },
  });

  const handleAdd = (item: Omit<T, "id">) => {
    onAdd?.(item);
    setShowAddDialog(false);
  };

  const handleEdit = (item: Partial<T>) => {
    if (selectedItem) {
      onEdit?.(selectedItem.id, item);
      setShowEditDialog(false);
      setSelectedItem(null);
    }
  };

  const handleDelete = () => {
    if (selectedItem) {
      onDelete?.(selectedItem.id);
      setShowDeleteDialog(false);
      setSelectedItem(null);
    }
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const importedData = JSON.parse(e.target?.result as string);
            onImport?.(importedData);
          } catch (error) {
            console.error("导入失败：", error);
          }
        };
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExport = () => {
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${
      config.title.toLowerCase().replace(/\s+/g, "-")
    }-export.json`;
    link.click();
    URL.revokeObjectURL(url);
    onExport?.();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{config.title}</CardTitle>
        {config.description && (
          <p className="text-sm text-muted-foreground">{config.description}</p>
        )}
      </CardHeader>
      <CardContent>
        {/* 工具栏 */}
        <div className="flex items-center justify-between space-x-2 py-4">
          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={config.searchPlaceholder || "搜索..."}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                className="pl-8 max-w-sm"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {config.allowImport && (
              <Button variant="outline" size="sm" onClick={handleImport}>
                <Upload className="mr-2 h-4 w-4" />
                导入
              </Button>
            )}
            {config.allowExport && (
              <Button variant="outline" size="sm" onClick={handleExport}>
                <Download className="mr-2 h-4 w-4" />
                导出
              </Button>
            )}
            {config.allowAdd && (
              <Button
                size="sm"
                onClick={() => setShowAddDialog(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                添加
              </Button>
            )}
          </div>
        </div>

        {/* 数据表格 */}
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id}>
                      {header.isPlaceholder ? null : flexRender(
                        header.column.columnDef.header,
                        header.getContext(),
                      )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length
                ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>
                          {flexRender(
                            cell.column.columnDef.cell,
                            cell.getContext(),
                          )}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                )
                : (
                  <TableRow>
                    <TableCell
                      colSpan={columnsWithActions.length}
                      className="h-24 text-center"
                    >
                      {config.emptyMessage || "暂无数据"}
                    </TableCell>
                  </TableRow>
                )}
            </TableBody>
          </Table>
        </div>

        {/* 分页 */}
        <div className="flex items-center justify-end space-x-2 py-4">
          <div className="flex-1 text-sm text-muted-foreground">
            共 {table.getFilteredRowModel().rows.length} 条记录
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
            >
              上一页
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
            >
              下一页
            </Button>
          </div>
        </div>
      </CardContent>

      {/* 添加对话框 */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>添加{config.title}</DialogTitle>
            <DialogDescription>
              请填写以下信息来添加新的{config.title}。
            </DialogDescription>
          </DialogHeader>
          {renderAddForm?.(handleAdd, () => setShowAddDialog(false))}
        </DialogContent>
      </Dialog>

      {/* 编辑对话框 */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>编辑{config.title}</DialogTitle>
            <DialogDescription>
              修改以下信息来更新{config.title}。
            </DialogDescription>
          </DialogHeader>
          {selectedItem && renderEditForm?.(selectedItem, handleEdit, () => {
            setShowEditDialog(false);
            setSelectedItem(null);
          })}
        </DialogContent>
      </Dialog>

      {/* 删除确认对话框 */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除</AlertDialogTitle>
            <AlertDialogDescription>
              此操作无法撤销。这将永久删除选中的{config.title}。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              onClick={() => {
                setShowDeleteDialog(false);
                setSelectedItem(null);
              }}
            >
              取消
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>
              删除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
