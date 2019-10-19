#!/bin/bash

for i in *txt; do
	name=$(basename $i .txt)
#	awk 'NR % 3 == 0' $i | awk -v str=$name '{print $2, str}' > $(basename $i .txt)_list.tsv;
	awk 'NR % 3 == 0' $i | awk -v str=$name 'BEGIN {OFS="\t"}; {print $2, str}' > $(basename $i .txt)_list.tsv;
done
