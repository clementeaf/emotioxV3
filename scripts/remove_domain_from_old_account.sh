#!/bin/bash
set -e

# Usage hint
if [ -z "$AWS_PROFILE" ] && [ -z "$AWS_ACCESS_KEY_ID" ]; then
    echo "⚠️  WARNING: No AWS credentials detected."
    echo "Usage: export AWS_PROFILE=old-account-profile && ./remove_domain_from_old_account.sh"
    echo "   OR: export AWS_ACCESS_KEY_ID=... AWS_SECRET_ACCESS_KEY=... && ./remove_domain_from_old_account.sh"
    echo ""
fi

DOMAINS=("research.emotiox.org" "participant.emotiox.org")

for DOMAIN in "${DOMAINS[@]}"; do
    echo "🔍 Searching for distribution with alias: $DOMAIN"
    
    # metrics for user feedback
    DIST_ID=$(aws cloudfront list-distributions --query "DistributionList.Items[?Aliases.Items!=null] | [?contains(Aliases.Items, '$DOMAIN')].Id | [0]" --output text)

    if [ "$DIST_ID" == "None" ] || [ -z "$DIST_ID" ]; then
        echo "✅ Domain $DOMAIN not found in any distribution (or no access)."
        continue
    fi

    echo "Found Distribution: $DIST_ID"
    echo "Fetching config..."
    
    # Get Config and ETag
    aws cloudfront get-distribution-config --id $DIST_ID > dist_config.json
    ETAG=$(grep ETag dist_config.json | awk -F'"' '{print $4}')
    
    # Filter Config using jq to remove the specific domain from Aliases
    # Note: We need to handle Quantity update too. if Items becomes empty, Quantity is 0.
    jq --arg domain "$DOMAIN" '
        .DistributionConfig 
        | .Aliases.Items |= map(select(. != $domain)) 
        | .Aliases.Quantity = (.Aliases.Items | length)
    ' dist_config.json > new_config.json

    echo "Updating distribution to remove $DOMAIN..."
    aws cloudfront update-distribution --id $DIST_ID --distribution-config file://new_config.json --if-match $ETAG > /dev/null

    echo "✅ Successfully removed $DOMAIN from $DIST_ID"
    rm dist_config.json new_config.json
done

echo "🎉 cleanup complete. Now you can run ./scripts/provision_cloudfront.sh"
