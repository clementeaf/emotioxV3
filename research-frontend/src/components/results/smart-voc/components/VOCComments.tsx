interface VOCCommentsProps {
    comments: Array<{ text: string; sentiment?: string }>;
}

export const VOCComments = ({ comments }: VOCCommentsProps) => {
    return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Voice of Customer Comments
            </h2>
            <div className="space-y-3 max-h-96 overflow-y-auto">
                {comments.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                        No comments available yet
                    </p>
                ) : (
                    comments.map((comment, index) => (
                        <div
                            key={index}
                            className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                        >
                            <p className="text-sm text-gray-700">{comment.text}</p>
                            {comment.sentiment && (
                                <span className="text-xs text-gray-500 mt-1 inline-block">
                                    Sentiment: {comment.sentiment}
                                </span>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};
