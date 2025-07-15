"use client";

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Edit3, Save, X, MessageSquare, Trash2 } from 'lucide-react';
import { useChartComments } from '@/hooks/use-chart-comments';

interface ChartCommentProps {
  chartId: string;
  chartTitle: string;
}

export function ChartComment({ chartId, chartTitle }: ChartCommentProps) {
  const { getComment, updateComment, deleteComment } = useChartComments();
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState('');
  
  const comment = getComment(chartId);
  const hasComment = comment && comment.content.trim().length > 0;

  const handleStartEdit = () => {
    setEditContent(comment?.content || '');
    setIsEditing(true);
  };

  const handleSave = () => {
    if (editContent.trim()) {
      updateComment(chartId, editContent.trim());
    } else if (comment) {
      deleteComment(chartId);
    }
    setIsEditing(false);
    setEditContent('');
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditContent('');
  };

  const handleDelete = () => {
    deleteComment(chartId);
  };

  if (!hasComment && !isEditing) {
    return (
      <Card className="mt-4 border-dashed border-gray-300">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-500">
              <MessageSquare className="h-4 w-4" />
              <span className="text-sm">Add analysis comment for {chartTitle}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleStartEdit}
              className="text-gray-500 hover:text-gray-700"
            >
              <Edit3 className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (isEditing) {
    return (
      <Card className="mt-4 border-blue-200 bg-blue-50/50">
        <CardContent className="p-4">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-blue-700">
              <Edit3 className="h-4 w-4" />
              <span className="font-medium text-sm">Editing analysis for {chartTitle}</span>
            </div>
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Add your analysis and insights about this chart..."
              className="min-h-[100px] resize-none border-blue-200 focus:border-blue-400 focus:ring-blue-400"
              autoFocus
            />
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mt-4 border-green-200 bg-green-50/50">
      <CardContent className="p-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-green-700">
              <MessageSquare className="h-4 w-4" />
              <span className="font-medium text-sm">Analysis for {chartTitle}</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleStartEdit}
                className="text-green-600 hover:text-green-700 h-8 w-8 p-0"
              >
                <Edit3 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDelete}
                className="text-red-500 hover:text-red-700 h-8 w-8 p-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {comment?.content}
          </div>
          {comment?.updatedAt && (
            <div className="text-xs text-gray-500">
              Last updated: {new Date(comment.updatedAt).toLocaleString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}