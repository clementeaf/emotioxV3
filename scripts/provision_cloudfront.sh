#!/bin/bash
set -e

# Configuration
BUCKET_NAME="${S3_BUCKET_NAME:-emotiox-unified-058310}"
# Wildcard Cert ARN
CERT_ARN="arn:aws:acm:us-east-1:058310292956:certificate/4999a591-4895-44f9-bb89-2a2b8c838d61"
REGION="us-east-1"
PROFILE="${AWS_PROFILE:-emotiox-migration}"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text --profile $PROFILE)

echo "🚀 Provisioning CloudFront for Bucket: $BUCKET_NAME"
echo "🔑 Using Cert ARN: $CERT_ARN"
echo "👤 Account ID: $ACCOUNT_ID"

# 1. Create Origin Access Control (OAC)
echo "------------------------------------------------"
echo "1. Checking/Creating Origin Access Control..."
# Check for existing OAC
OAC_ID=$(aws cloudfront list-origin-access-controls --profile $PROFILE --query "OriginAccessControlList.Items[?Name=='emotiox-oac'].Id | [0]" --output text)

if [ "$OAC_ID" == "None" ] || [ -z "$OAC_ID" ]; then
    echo "Creating new OAC..."
    OAC_ID=$(aws cloudfront create-origin-access-control \
        --origin-access-control-config Name=emotiox-oac,Description="OAC for Emotiox",SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3 \
        --query "OriginAccessControl.Id" --output text --profile $PROFILE)
fi

if [ -z "$OAC_ID" ] || [ "$OAC_ID" == "None" ]; then
    echo "❌ Failed to create/retrieve OAC ID"
    exit 1
fi

echo "✅ OAC ID: $OAC_ID"

# Function to create distribution config
create_dist_config() {
    local reference=$1
    local alias=$2
    local origin_path=$3
    local start_cert=$4
    
    cat <<EOF
{
    "CallerReference": "$reference-$(date +%s)",
    "Aliases": {
        "Quantity": 1,
        "Items": ["$alias"]
    },
    "DefaultRootObject": "index.html",
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "S3-$BUCKET_NAME",
                "DomainName": "$BUCKET_NAME.s3.amazonaws.com",
                "OriginPath": "$origin_path",
                "S3OriginConfig": {
                    "OriginAccessIdentity": ""
                },
                "OriginAccessControlId": "$OAC_ID"
            }
        ]
    },
    "DefaultCacheBehavior": {
        "TargetOriginId": "S3-$BUCKET_NAME",
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": { "Forward": "none" }
        },
        "TrustedSigners": { "Enabled": false, "Quantity": 0 },
        "ViewerProtocolPolicy": "redirect-to-https",
        "MinTTL": 0,
        "AllowedMethods": {
            "Quantity": 2,
            "Items": ["HEAD", "GET"],
            "CachedMethods": {
                "Quantity": 2,
                "Items": ["HEAD", "GET"]
            }
        },
        "SmoothStreaming": false
    },
    "CacheBehaviors": { "Quantity": 0 },
    "CustomErrorResponses": {
        "Quantity": 1,
        "Items": [
            {
                "ErrorCode": 403,
                "ResponsePagePath": "/index.html",
                "ResponseCode": "200",
                "ErrorCachingMinTTL": 300
            }
        ]
    },
    "Comment": "Emotiox $reference Frontend",
    "Enabled": true,
    "ViewerCertificate": {
        "ACMCertificateArn": "$start_cert",
        "SSLSupportMethod": "sni-only",
        "MinimumProtocolVersion": "TLSv1.2_2021"
    }
}
EOF
}

# 2. Deploy Research Frontend (portal.emotiox.org)
echo "------------------------------------------------"
echo "2. Checking Research Distribution (portal)..."

RESEARCH_DIST_ID=$(aws cloudfront list-distributions --profile $PROFILE --query "DistributionList.Items[?Aliases.Items[?(@=='portal.emotiox.org')]].Id" --output text)

if [ -z "$RESEARCH_DIST_ID" ]; then
    echo "Creating Research Distribution (portal.emotiox.org)..."
    create_dist_config "research-frontend" "portal.emotiox.org" "/research-frontend" "$CERT_ARN" > research_dist_config.json
    RESEARCH_DIST_ID=$(aws cloudfront create-distribution --distribution-config file://research_dist_config.json --profile $PROFILE --query Distribution.Id --output text)
    rm research_dist_config.json
    echo "✅ Created Research Distribution: $RESEARCH_DIST_ID"
else
    echo "Creation skipped: Distribution for portal.emotiox.org already exists ($RESEARCH_DIST_ID)"
fi

# 3. Deploy Participant Frontend (app.emotiox.org)
echo "------------------------------------------------"
echo "3. Checking Participant Distribution (app)..."

PARTICIPANT_DIST_ID=$(aws cloudfront list-distributions --profile $PROFILE --query "DistributionList.Items[?Aliases.Items[?(@=='app.emotiox.org')]].Id" --output text)

if [ -z "$PARTICIPANT_DIST_ID" ]; then
    echo "Creating Participant Distribution (app.emotiox.org)..."
    create_dist_config "participant-frontend" "app.emotiox.org" "/participant-frontend" "$CERT_ARN" > participant_dist_config.json
    PARTICIPANT_DIST_ID=$(aws cloudfront create-distribution --distribution-config file://participant_dist_config.json --profile $PROFILE --query Distribution.Id --output text)
    rm participant_dist_config.json
    echo "✅ Created Participant Distribution: $PARTICIPANT_DIST_ID"
else
    echo "Creation skipped: Distribution for app.emotiox.org already exists ($PARTICIPANT_DIST_ID)"
fi

# 4. Update Bucket Policy (Idempotent-ish)
echo "------------------------------------------------"
echo "4. Updating S3 Bucket Policy..."

cat <<EOF > bucket_policy.json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "AllowCloudFrontServicePrincipal",
            "Effect": "Allow",
            "Principal": {
                "Service": "cloudfront.amazonaws.com"
            },
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::$BUCKET_NAME/*",
            "Condition": {
                "StringEquals": {
                    "AWS:SourceAccount": "$ACCOUNT_ID"
                }
            }
        }
    ]
}
EOF

aws s3api put-bucket-policy --bucket $BUCKET_NAME --policy file://bucket_policy.json --profile $PROFILE
rm bucket_policy.json
echo "✅ Bucket Policy updated to allow CloudFront access."

echo "------------------------------------------------"
echo "🎉 CloudFront Provisioning Initiated!"
echo "It may take 5-15 minutes for distributions to be fully deployed."
echo "Research URL: https://research.emotiox.org (Dist: $RESEARCH_DIST_ID)"
echo "Participant URL: https://participant.emotiox.org (Dist: $PARTICIPANT_DIST_ID)"
