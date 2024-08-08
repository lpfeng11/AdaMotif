import os
import json

all_data = []

graphName = 'Cpan'
# graphName = 'AS-733'
# graphName = 'test'

communityPartitionMethod = 'multilevel'

cluster_method = 'AffinityPropagation'

# 文件夹路径
folder_path = f'../data_processed/{graphName}/aligned_subgraph_point_data'

files = os.listdir(folder_path)

sorted_files = sorted((f for f in files if f.endswith('.txt')), key=lambda x: int(x.split('_')[1]))

for filename in sorted_files:
    temp_data = []
    file_path = os.path.join(folder_path, filename)

    if os.path.exists(file_path):
        with open(file_path, 'r') as file:
            data = file.readlines()
            data = [tuple(map(int, line.strip().split(', '))) for line in data]
            temp_data.extend(data)
    else:
        print(f"File {filename} does not exist.")
    all_data.append(temp_data)

json_data = {'data': all_data}

output_file = f'../data_processed/{graphName}/align_subgraph_json'
if not os.path.exists(output_file):
    os.makedirs(output_file)
with open(os.path.join(output_file, 'align_subgraph.json'), 'w') as file:
    json.dump(json_data, file, indent=4)

print(f"Data from files has been saved to {output_file}.")
