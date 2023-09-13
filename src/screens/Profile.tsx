import { useState } from 'react';
import { TouchableOpacity } from 'react-native';
import {
	Center,
	ScrollView,
	VStack,
	Skeleton,
	Text,
	Heading,
	useToast,
} from 'native-base';
import { Controller, useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';

import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as yup from 'yup';

import { api } from '@services/api';
import { useAuth } from '@hooks/useAuth';
import { AppError } from '@utils/AppError';

import { ScreenHeader } from '@components/ScreenHeader';
import { UserPhoto } from '@components/UserPhoto';
import { Input } from '@components/Input';
import { Button } from '@components/Button';

const PHOTO_SIZE = 33;

type FormDataProps = {
	name: string;
	email: string;
	password: string;
	old_password: string;
	confirm_password: string;
};

const profileSchema = yup.object({
	name: yup.string().required('Informe o nome.'),
	password: yup
		.string()
		.min(6, 'A senha deve ter pelo menos 6 dígitos.')
		.nullable()
		.transform((value) => (!!value ? value : null)),
	confirm_password: yup
		.string()
		.nullable()
		.transform((value) => (!!value ? value : null))
		.oneOf([yup.ref('password')], 'As senhas informadas são diferentes.')
		.when('password', {
			is: (Field: any) => Field,
			then: (schema) =>
				schema
					.nullable()
					.required('Informe a confirmação da senha.')
					.transform((value) => (!!value ? value : null)),
		}),
});

export function Profile() {
	const [isUpdating, setIsUpdating] = useState(false);
	const [photoIsLoading, setPhotoIsLoading] = useState(false);
	const [userPhoto, setUserPhoto] = useState(
		'https://github.com/codewlad.png'
	);

	const toast = useToast();
	const { user, updateUserProfile } = useAuth();

	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<FormDataProps>({
		defaultValues: {
			name: user.name,
			email: user.email,
		},
		resolver: yupResolver(profileSchema),
	});

	async function handleUserPhotoSelect() {
		try {
			setPhotoIsLoading(true);

			const photoSelected = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				quality: 1,
				aspect: [4, 4],
				allowsEditing: true,
			});

			if (photoSelected.canceled) {
				return;
			}

			if (photoSelected.assets[0].uri) {
				const photoInfo = await FileSystem.getInfoAsync(
					photoSelected.assets[0].uri
				);

				if (photoInfo.exists && photoInfo.size / 1024 / 1024 > 5) {
					return toast.show({
						title: 'Essa imagem é muito grande. Escolha uma de até 5MB',
						placement: 'top',
						bgColor: 'red.500',
					});
				}

				setUserPhoto(photoSelected.assets[0].uri);
			}
		} catch (error) {
			console.log(error);
		} finally {
			setPhotoIsLoading(false);
		}
	}

	async function handleProfileUpdate(data: FormDataProps) {
		try {
			setIsUpdating(true);

			const userUpdated = user;
			userUpdated.name = data.name;

			await api.put('/users', data);

			await updateUserProfile(userUpdated);

			toast.show({
				title: 'Perfil atualizado com sucesso!',
				placement: 'top',
				bgColor: 'green.500',
			});
		} catch (error) {
			const isAppError = error instanceof AppError;
			const title = isAppError
				? error.message
				: 'Não foi possível atualizar os dados. Tente novamente mais tarde.';

			toast.show({
				title,
				placement: 'top',
				bgColor: 'red.500',
			});
		} finally {
			setIsUpdating(false);
		}
	}

	return (
		<VStack flex={1}>
			<ScreenHeader title='Perfil' />

			<ScrollView>
				<Center
					mt={6}
					px={10}
				>
					{photoIsLoading ? (
						<Skeleton
							w={PHOTO_SIZE}
							h={PHOTO_SIZE}
							rounded={'full'}
							startColor={'gray.500'}
							endColor={'gray.400'}
						/>
					) : (
						<UserPhoto
							source={{ uri: userPhoto }}
							alt='Foto do usuário'
							size={PHOTO_SIZE}
						/>
					)}

					<TouchableOpacity onPress={handleUserPhotoSelect}>
						<Text
							color={'green.500'}
							fontWeight={'bold'}
							fontSize={'md'}
							mt={2}
							mb={8}
						>
							Alterar foto
						</Text>
					</TouchableOpacity>

					<Controller
						control={control}
						name='name'
						render={({ field: { value, onChange } }) => (
							<Input
								bg={'gray.600'}
								placeholder='Nome'
								onChangeText={onChange}
								value={value}
								errorMessage={errors.name?.message}
							/>
						)}
					/>

					<Controller
						control={control}
						name='email'
						render={({ field: { value, onChange } }) => (
							<Input
								bg={'gray.600'}
								placeholder='E-mail'
								isDisabled
								onChangeText={onChange}
								value={value}
							/>
						)}
					/>
				</Center>

				<VStack
					px={10}
					mt={12}
					mb={9}
				>
					<Heading
						color={'gray.200'}
						fontSize={'md'}
						mb={2}
						fontFamily={'heading'}
					>
						Alterar senha
					</Heading>

					<Controller
						control={control}
						name='old_password'
						render={({ field: { onChange } }) => (
							<Input
								bg={'gray.600'}
								placeholder='Senha antiga'
								secureTextEntry
								onChangeText={onChange}
							/>
						)}
					/>

					<Controller
						control={control}
						name='password'
						render={({ field: { onChange } }) => (
							<Input
								bg={'gray.600'}
								placeholder='Nova senha'
								secureTextEntry
								onChangeText={onChange}
								errorMessage={errors.password?.message}
							/>
						)}
					/>

					<Controller
						control={control}
						name='confirm_password'
						render={({ field: { onChange } }) => (
							<Input
								bg={'gray.600'}
								placeholder='Confirme a nova senha'
								secureTextEntry
								onChangeText={onChange}
								errorMessage={errors.confirm_password?.message}
							/>
						)}
					/>

					<Button
						title='Atualizar'
						mt={4}
						onPress={handleSubmit(handleProfileUpdate)}
						isLoading={isUpdating}
					/>
				</VStack>
			</ScrollView>
		</VStack>
	);
}
