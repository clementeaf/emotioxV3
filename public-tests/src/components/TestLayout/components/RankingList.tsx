import React, { useState } from 'react';
import { RankingListProps } from './RankingListTypes';
import { useRankingData } from './useRankingData';
import { useRankingActions } from './useRankingActions';
import { RankingListUI } from './RankingListUI';

export const RankingList: React.FC<RankingListProps> = ({
    items,
    onMoveUp,
    onMoveDown,
    isSaving,
    isApiLoading,
    dataLoading,
    currentQuestionKey,
    initialFormData
}) => {
    const { rankedItems, isLoading, error } = useRankingData({
        items,
        currentQuestionKey,
        initialFormData
    });

    const [localRankedItems, setLocalRankedItems] = useState<string[]>(rankedItems);

    const { handleMoveUp, handleMoveDown } = useRankingActions({
        rankedItems: localRankedItems,
        setRankedItems: setLocalRankedItems,
        currentQuestionKey,
        onMoveUp,
        onMoveDown
    });

    React.useEffect(() => {
        setLocalRankedItems(rankedItems);
    }, [rankedItems]);

    if (error) {
        return (
            <div className="mb-4">
                <p className="text-red-500">⚠️ {error}</p>
            </div>
        );
    }

    return (
        <RankingListUI
            rankedItems={localRankedItems}
            isSaving={isSaving}
            isApiLoading={isApiLoading}
            dataLoading={dataLoading || isLoading}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
        />
    );
};
