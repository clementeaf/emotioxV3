#!/bin/bash

# Monitor GitHub Actions workflows
echo "Monitoring GitHub Actions workflows..."

# Get the latest workflow runs
echo "Fetching latest workflow runs..."
gh run list --limit 10

echo ""
echo "To watch a specific run, use:"
echo "gh run watch <run-id>"
echo ""
echo "To view logs for a specific run, use:"
echo "gh run view <run-id> --log"